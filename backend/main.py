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
import random

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
    "롤플레잉 게임 공략", "인디게임 리뷰", "보드게임 전략", "레트로 게임 추억",
    "개그 코미디 웃음", "버라이어티 예능 프로그램", "마술 신기한 트릭", "서프라이즈 몰래카메라",
    "수영 다이빙 수상스포츠", "격투기 무술 훈련", "익스트림 스포츠 스케이트보드", "골프 테니스 라켓",
    "재즈 블루스 음악", "국악 전통음악 판소리", "뮤지컬 공연 무대", "인디밴드 라이브 공연",
    "전통 한식 요리법", "길거리 음식 세계여행", "채식 비건 요리", "제과제빵 케이크 만들기",
    "야생동물 생태 다큐", "반려동물 훈련 육아", "곤충 파충류 관찰", "해양생물 수중탐험",
    "시골 농촌 체험여행", "혼자 오지 배낭여행", "국내 숨겨진 여행지", "캠핑 백패킹 아웃도어",
    "그림 수채화 스케치", "도자기 공예 만들기", "목공 DIY 가구제작", "뜨개질 자수 손바느질",
    "우주 천문학 별자리", "생물 식물 자연과학", "역사 유적 고고학", "심리학 행동 실험",
    "환경보호 재활용 실천", "봉사활동 나눔 이야기", "농업 귀농 텃밭", "전통문화 민속 축제",
]

category_keywords = {
    "정치·사회": ["환경보호 재활용 실천", "봉사활동 나눔 이야기", "전통문화 민속 축제"],
    "과학·기술": ["우주 천문학 별자리", "생물 식물 자연과학", "심리학 행동 실험"],
    "경제·경영": ["목공 DIY 가구제작", "농업 귀농 텃밭", "채식 비건 요리"],
    "문화·예술": ["재즈 블루스 음악", "국악 전통음악 판소리", "뮤지컬 공연 무대", "그림 수채화 스케치"],
    "건강·라이프": ["수영 다이빙 수상스포츠", "격투기 무술 훈련", "캠핑 백패킹 아웃도어"],
    "게임·엔터": ["롤플레잉 게임 공략", "인디게임 리뷰", "개그 코미디 웃음", "버라이어티 예능 프로그램"],
    "음식·여행": ["전통 한식 요리법", "길거리 음식 세계여행", "시골 농촌 체험여행", "혼자 오지 배낭여행"],
}

keyword_embeddings = model.encode(KEYWORD_POOL)
category_embeddings = {
    cat: np.mean(model.encode(kws), axis=0)
    for cat, kws in category_keywords.items()
}

def get_user_file(user_id: str):
    safe_id = user_id.replace("/", "_").replace("\\", "_").replace(":", "_")
    return f"user_data_{safe_id}.json"

def load_data(user_id: str = "user_default"):
    file = get_user_file(user_id)
    if os.path.exists(file):
        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"vectors": [], "history": [], "analyzed_texts": [], "used_keywords": [], "last_anti_keywords": []}

def save_data(data, user_id: str = "user_default"):
    file = get_user_file(user_id)
    with open(file, "w", encoding="utf-8") as f:
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
    video_id = extract_youtube_id(url)
    if video_id and YOUTUBE_API_KEY:
        try:
            youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
            res = youtube.videos().list(part='snippet', id=video_id).execute()
            if res['items']:
                snippet = res['items'][0]['snippet']
                title = snippet.get('title', '')
                description = snippet.get('description', '')[:300]
                tags = ' '.join(snippet.get('tags', [])[:10])
                print(f"YouTube 영상 분석: {title}")
                return f"{title} {description} {tags}"
        except Exception as e:
            print(f"YouTube API 오류: {e}")
    return None

def get_page_text(url):
    try:
        res = requests.get(url, timeout=5, verify=False,
                          headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, "html.parser")
        for tag in soup(['script', 'style', 'nav', 'footer']):
            tag.decompose()
        return soup.get_text(separator=' ', strip=True)[:500]
    except:
        return "분석 실패"

def calculate_bias_score(vectors):
    if not vectors:
        return 0
    if len(vectors) < 3:
        return 10

    centroid = np.mean(vectors, axis=0)
    scores = np.array([
        cosine_similarity([centroid], [cat_vec])[0][0]
        for cat_vec in category_embeddings.values()
    ])

    # 정규화
    scores_normalized = (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)

    # 지니 계수 방식
    sorted_scores = np.sort(scores_normalized)
    n = len(sorted_scores)
    gini = (2 * np.sum((np.arange(1, n+1)) * sorted_scores) - (n + 1) * np.sum(sorted_scores)) / (n * np.sum(sorted_scores) + 1e-9)

    # 0~85 스케일
    bias = round(float(gini) * 85)
    return min(85, max(0, bias))

def compute_anti_keywords(vectors, used_keywords):
    if not vectors:
        return random.sample(KEYWORD_POOL, 5)

    centroid = np.mean(vectors, axis=0)

    cat_similarities = {}
    for cat, cat_vec in category_embeddings.items():
        sim = cosine_similarity([centroid], [cat_vec])[0][0]
        cat_similarities[cat] = sim

    top_cats = sorted(cat_similarities, key=cat_similarities.get, reverse=True)[:2]
    bottom_cats = sorted(cat_similarities, key=cat_similarities.get)[:3]

    print(f"많이 본 카테고리: {top_cats}")
    print(f"추천 카테고리: {bottom_cats}")

    candidate_keywords = []
    for cat in bottom_cats:
        candidate_keywords.extend(category_keywords.get(cat, []))

    if not candidate_keywords:
        candidate_keywords = KEYWORD_POOL

    candidate_keywords = [kw for kw in candidate_keywords if kw not in used_keywords]
    if not candidate_keywords:
        candidate_keywords = KEYWORD_POOL

    selected = random.sample(candidate_keywords, min(5, len(candidate_keywords)))
    return selected

def get_category_scores(vectors):
    if not vectors:
        return []
    centroid = np.mean(vectors, axis=0)
    scores = []
    all_sims = [cosine_similarity([centroid], [cat_vec])[0][0]
                for cat_vec in category_embeddings.values()]
    min_sim = min(all_sims)
    max_sim = max(all_sims)

    for cat, cat_vec in category_embeddings.items():
        sim = cosine_similarity([centroid], [cat_vec])[0][0]
        # 정규화해서 퍼센트로 변환
        if max_sim - min_sim > 0:
            percent = round((sim - min_sim) / (max_sim - min_sim) * 100)
        else:
            percent = 50
        scores.append({"name": cat, "percent": min(100, max(0, percent))})
    return scores

class PostRequest(BaseModel):
    url: str
    user_id: str = "user_default"

@app.get("/")
def root():
    return {"message": "Ghost Feed API 실행 중"}

@app.post("/analyze")
def analyze(body: PostRequest):
    text = get_youtube_text(body.url)
    if not text:
        text = get_page_text(body.url)

    print(f"[{body.user_id}] 분석 텍스트: {text[:80]}")

    vector = model.encode([text])[0]
    data = load_data(body.user_id)
    data["vectors"].append(vector.tolist())

    if "analyzed_texts" not in data:
        data["analyzed_texts"] = []
    data["analyzed_texts"].append({"url": body.url, "text": text[:100]})

    score = calculate_bias_score(data["vectors"])
    data["history"].append(score)
    data["vectors"] = data["vectors"][-100:]
    data["history"] = data["history"][-50:]
    data["analyzed_texts"] = data["analyzed_texts"][-50:]

    used_keywords = data.get("used_keywords", [])
    new_keywords = compute_anti_keywords(data["vectors"], used_keywords)
    data["last_anti_keywords"] = new_keywords
    used_keywords.extend(new_keywords)
    data["used_keywords"] = used_keywords[-20:]

    save_data(data, body.user_id)

    return {
        "status": "ok",
        "text": text[:100],
        "message": "분석 완료!",
        "anti_keywords": new_keywords
    }

@app.get("/anti-keywords/{user_id}")
def get_anti_keywords(user_id: str):
    data = load_data(user_id)
    vectors = data["vectors"]
    used_keywords = data.get("used_keywords", [])
    last_keywords = data.get("last_anti_keywords", [])

    if last_keywords:
        selected = last_keywords
    else:
        selected = compute_anti_keywords(vectors, used_keywords)
        used_keywords.extend(selected)
        data["used_keywords"] = used_keywords[-20:]
        data["last_anti_keywords"] = selected
        save_data(data, user_id)

    youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
    results = []
    for keyword in selected:
        try:
            res = youtube.search().list(
                q=keyword,
                part='snippet',
                maxResults=5,
                type='video',
                relevanceLanguage='ko',
                order='relevance'
            ).execute()

            if res['items']:
                item = random.choice(res['items'])
                results.append({
                    "keyword": keyword,
                    "videoId": item['id']['videoId'],
                    "title": item['snippet']['title'],
                    "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                    "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
                })
        except Exception as e:
            print(f"YouTube 검색 오류: {e}")

    return {"keywords": results}

@app.get("/report/{user_id}")
def get_report(user_id: str):
    data = load_data(user_id)
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

    bias_score = calculate_bias_score(vectors)
    category_scores = get_category_scores(vectors)

    return {
        "biasScore": bias_score,
        "diversity": 100 - bias_score,
        "history": history[-10:],
        "categories": category_scores,
        "totalAnalyzed": len(vectors)
    }

@app.delete("/reset/{user_id}")
def reset_data(user_id: str):
    file = get_user_file(user_id)
    if os.path.exists(file):
        os.remove(file)
    return {"message": "데이터 초기화 완료"}