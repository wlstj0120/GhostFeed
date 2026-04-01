import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import os
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from googleapiclient.discovery import build
from dotenv import load_dotenv
import json
import re

load_dotenv()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("모델 로딩 중...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
print("모델 로딩 완료!")

KEYWORD_POOL = [
    "정치경제", "창업스타트업", "전통문화역사", "자연환경생태", "종교철학",
    "스포츠운동", "해외여행", "시민사회", "노동운동", "복지",
    "인문학독서", "농업", "육아", "요리", "건강의학",
    "음악감상", "천문학우주", "봉사활동", "반려동물", "명상",
]

category_keywords = {
    "정치·사회": ["정치경제", "시민사회", "노동운동", "복지"],
    "과학·기술": ["창업스타트업", "천문학우주"],
    "경제·경영": ["창업스타트업", "정치경제"],
    "문화·예술": ["전통문화역사", "음악감상", "인문학독서"],
    "건강·라이프": ["건강의학", "육아", "요리", "반려동물", "명상"],
}

keyword_embeddings = model.encode(KEYWORD_POOL)
category_embeddings = {
    cat: np.mean(model.encode(kws), axis=0)
    for cat, kws in category_keywords.items()
}

DATA_FILE = "user_data.json"

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"vectors": [], "history": [], "analyzed_texts": []}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

def extract_youtube_id(url):
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11})',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
        r'shorts\/([0-9A-Za-z_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_youtube_text(url):
    """YouTube URL이면 API로 제목+설명 가져오기"""
    video_id = extract_youtube_id(url)
    if video_id and YOUTUBE_API_KEY:
        try:
            youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
            res = youtube.videos().list(
                part='snippet',
                id=video_id
            ).execute()
            if res['items']:
                snippet = res['items'][0]['snippet']
                title = snippet.get('title', '')
                description = snippet.get('description', '')[:300]
                tags = ' '.join(snippet.get('tags', [])[:10])
                return f"{title} {description} {tags}"
        except:
            pass
    return None

def get_page_text(url):
    """일반 URL은 스크래핑"""
    try:
        res = requests.get(url, timeout=5, verify=False,
                          headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, "html.parser")
        # 불필요한 태그 제거
        for tag in soup(['script', 'style', 'nav', 'footer']):
            tag.decompose()
        text = soup.get_text(separator=' ', strip=True)[:500]
        return text
    except:
        return "분석 실패"

class PostRequest(BaseModel):
    url: str

@app.get("/")
def root():
    return {"message": "Ghost Feed API 실행 중"}

@app.post("/analyze")
def analyze(body: PostRequest):
    # YouTube면 API, 아니면 스크래핑
    text = get_youtube_text(body.url)
    if not text:
        text = get_page_text(body.url)

    vector = model.encode([text])[0]

    data = load_data()
    data["vectors"].append(vector.tolist())
    if "analyzed_texts" not in data:
        data["analyzed_texts"] = []
    data["analyzed_texts"].append({"url": body.url, "text": text[:100]})

    score = calculate_bias_score(data["vectors"])
    data["history"].append(score)

    data["vectors"] = data["vectors"][-100:]
    data["history"] = data["history"][-50:]
    data["analyzed_texts"] = data["analyzed_texts"][-50:]

    save_data(data)

    return {
        "status": "ok",
        "text": text[:100],
        "message": "분석 완료!"
    }

def calculate_bias_score(vectors):
    if not vectors:
        return 50
    centroid = np.mean(vectors, axis=0)
    scores = []
    for cat, cat_vec in category_embeddings.items():
        sim = cosine_similarity([centroid], [cat_vec])[0][0]
        scores.append(sim)
    scores = np.array(scores)
    bias = float((scores.max() - scores.mean()) / (scores.std() + 1e-9) * 30 + 50)
    return min(100, max(0, round(bias)))

@app.get("/anti-keywords/{user_id}")
def get_anti_keywords(user_id: str):
    data = load_data()
    vectors = data["vectors"]

    if not vectors:
        keywords = KEYWORD_POOL[:5]
    else:
        centroid = np.mean(vectors, axis=0)
        anti_vector = -centroid / np.linalg.norm(centroid)
        similarities = cosine_similarity([anti_vector], keyword_embeddings)[0]
        top_indices = similarities.argsort()[-5:][::-1]
        keywords = [KEYWORD_POOL[i] for i in top_indices]

    youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
    results = []
    for keyword in keywords:
        res = youtube.search().list(
            q=keyword,
            part='snippet',
            maxResults=1,
            type='video',
            relevanceLanguage='ko'
        ).execute()

        if res['items']:
            item = res['items'][0]
            results.append({
                "keyword": keyword,
                "videoId": item['id']['videoId'],
                "title": item['snippet']['title'],
                "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
            })

    return {"keywords": results}

@app.get("/report/{user_id}")
def get_report(user_id: str):
    data = load_data()
    vectors = data["vectors"]
    history = data["history"]

    if not vectors:
        return {
            "biasScore": 0,
            "diversity": 100,
            "history": [],
            "categories": [],
            "totalAnalyzed": 0
        }

    centroid = np.mean(vectors, axis=0)
    bias_score = calculate_bias_score(vectors)

    category_scores = []
    for cat, cat_vec in category_embeddings.items():
        sim = cosine_similarity([centroid], [cat_vec])[0][0]
        percent = round(float(sim) * 100)
        category_scores.append({"name": cat, "percent": min(100, max(0, percent))})

    diversity = 100 - bias_score

    return {
        "biasScore": bias_score,
        "diversity": diversity,
        "history": history[-10:],
        "categories": category_scores,
        "totalAnalyzed": len(vectors)
    }

@app.delete("/reset/{user_id}")
def reset_data(user_id: str):
    if os.path.exists(DATA_FILE):
        os.remove(DATA_FILE)
    return {"message": "데이터 초기화 완료"}