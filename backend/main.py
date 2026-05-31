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
from typing import List
import time

load_dotenv()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

print("모델 로딩 중...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
print("모델 로딩 완료!")

REDDIT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

CATEGORY_DATA = {
    "비디오게임": {
        "keywords": [
            "비디오게임 콘솔 플레이스테이션 Xbox",
            "PC게임 스팀 온라인 멀티플레이",
            "FPS 슈팅게임 배틀그라운드 오버워치",
            "RPG 롤플레잉 오픈월드 게임",
            "격투게임 철권 스트리트파이터 대전",
            "모바일게임 앱스토어 구글플레이",
            "스트리밍 트위치 게임방송 유튜브게임",
            "e스포츠 프로게이머 리그오브레전드",
        ],
        "reddit_keywords": ["video games", "gaming", "PC games", "console gaming", "esports", "game streaming", "RPG games", "FPS games"],
        "parent": "게임·엔터",
    },
    "보드게임·취미": {
        "keywords": [
            "보드게임 테이블 전략 규칙",
            "카드게임 포커 트럼프 보드",
            "체스 바둑 두뇌게임 전략",
            "퍼즐 레고 모형 조립 취미",
            "레트로 아날로그 오락 추억",
            "TTRPG 던전앤드래곤 역할극",
        ],
        "reddit_keywords": ["board games", "chess", "card games", "tabletop RPG", "puzzle", "LEGO", "hobby games"],
        "parent": "게임·엔터",
    },
    "예능·코미디": {
        "keywords": [
            "개그 코미디 웃음 유머 버라이어티",
            "예능 프로그램 버라이어티쇼 오락",
            "마술 신기한 트릭 공연 쇼",
            "몰래카메라 서프라이즈 리얼리티",
            "밈 인터넷 유머 짤방 영상",
            "팟캐스트 토크쇼 라디오 방송",
        ],
        "reddit_keywords": ["comedy", "funny", "humor", "memes", "entertainment", "talk show", "podcast", "reality TV"],
        "parent": "게임·엔터",
    },
    "스포츠·운동": {
        "keywords": [
            "축구 야구 농구 스포츠 경기",
            "수영 다이빙 수상스포츠 해양",
            "격투기 무술 복싱 UFC 훈련",
            "테니스 골프 라켓스포츠 배드민턴",
            "자전거 사이클링 MTB 라이딩",
            "피트니스 헬스 웨이트 트레이닝",
            "러닝 마라톤 조깅 달리기",
            "익스트림 스포츠 스케이트보드 서핑",
        ],
        "reddit_keywords": ["sports", "soccer", "basketball", "martial arts", "fitness", "running", "cycling", "weightlifting", "tennis"],
        "parent": "건강·라이프",
    },
    "건강·웰빙": {
        "keywords": [
            "요가 명상 마음챙김 스트레스",
            "하이킹 등산 트레킹 아웃도어",
            "캠핑 백패킹 야외활동 자연",
            "다이어트 건강식 영양 칼로리",
            "정신건강 심리치료 상담 마음",
            "수면 건강관리 라이프스타일",
        ],
        "reddit_keywords": ["yoga", "meditation", "hiking", "camping", "mental health", "diet", "wellness", "sleep", "nutrition"],
        "parent": "건강·라이프",
    },
    "음식·요리": {
        "keywords": [
            "한식 요리법 레시피 조리법",
            "채식 비건 식물성 건강요리",
            "길거리음식 맛집 탐방 식도락",
            "제과제빵 케이크 디저트 쿠키",
            "세계요리 이국적 음식 퓨전",
            "홈쿡 집밥 간단요리 원팬",
            "커피 카페 바리스타 음료",
            "와인 맥주 위스키 주류 음주",
        ],
        "reddit_keywords": ["cooking", "food", "recipes", "baking", "vegan food", "coffee", "beer", "wine", "meal prep", "restaurant"],
        "parent": "음식·여행",
    },
    "여행·탐험": {
        "keywords": [
            "해외여행 배낭여행 세계일주 여권",
            "국내여행 국내 여행지 관광",
            "캠핑 글램핑 차박 백패킹",
            "혼자여행 솔로트립 자유여행",
            "시골 농촌 체험 로컬여행",
            "호텔 숙박 에어비앤비 리조트",
            "항공 여행 비행기 공항 티켓",
        ],
        "reddit_keywords": ["travel", "backpacking", "solo travel", "camping", "adventure travel", "budget travel", "digital nomad", "road trip"],
        "parent": "음식·여행",
    },
    "과학·자연": {
        "keywords": [
            "우주 천문학 별자리 행성 NASA",
            "생물 식물 동물 자연과학 생태",
            "기후변화 환경 지구온난화 생태계",
            "의학 과학 연구 실험 발견",
            "수학 물리학 화학 논리 이론",
            "공룡 고생물 화석 진화 고고학",
            "해양 바다 심해 해양생물",
        ],
        "reddit_keywords": ["science", "space", "astronomy", "biology", "environment", "mathematics", "physics", "medicine", "nature", "wildlife"],
        "parent": "과학·기술",
    },
    "기술·개발": {
        "keywords": [
            "프로그래밍 코딩 소프트웨어 개발",
            "앱개발 모바일앱 웹개발 서비스",
            "인공지능 AI 머신러닝 딥러닝",
            "스타트업 창업 SaaS 플랫폼 비즈니스",
            "구독서비스 인앱결제 수익화 앱스토어",
            "클라우드 서버 DevOps 백엔드",
            "사이버보안 해킹 보안 네트워크",
            "전기차 자율주행 미래기술 로봇",
        ],
        "reddit_keywords": ["programming", "software development", "artificial intelligence", "startups", "app development", "cybersecurity", "technology", "machine learning", "SaaS", "entrepreneurship"],
        "parent": "과학·기술",
    },
    "문화·예술": {
        "keywords": [
            "재즈 블루스 클래식 음악 감상",
            "K팝 아이돌 팬덤 한류 음악",
            "미술 그림 수채화 스케치 일러스트",
            "뮤지컬 공연 무대 연극 예술",
            "도자기 공예 핸드메이드 DIY",
            "국악 전통문화 판소리 민요",
            "사진 촬영 포토그래피 카메라",
            "영화 드라마 시리즈 OTT 넷플릭스",
            "애니메이션 만화 웹툰 코믹",
            "패션 스타일 의류 브랜드 트렌드",
        ],
        "reddit_keywords": ["art", "music", "jazz", "K-pop", "painting", "crafts", "theater", "photography", "movies", "anime", "fashion", "drawing"],
        "parent": "문화·예술",
    },
    "경제·비즈니스": {
        "keywords": [
            "재테크 투자 주식 암호화폐 펀드",
            "절약 저축 가계부 재무관리",
            "창업 스타트업 비즈니스 사업",
            "직장생활 취업 커리어 이직",
            "부동산 아파트 월세 전세 투자",
            "세금 연말정산 금융 보험",
            "마케팅 브랜딩 광고 사업전략",
        ],
        "reddit_keywords": ["personal finance", "investing", "stocks", "cryptocurrency", "real estate", "career", "business", "marketing", "frugal living", "side hustle"],
        "parent": "경제·경영",
    },
    "사회·정치": {
        "keywords": [
            "환경보호 재활용 지속가능 ESG",
            "봉사활동 나눔 사회공헌 자원봉사",
            "전통문화 민속 축제 역사문화",
            "사회이슈 뉴스 시사 정치 정책",
            "인권 평등 다양성 포용",
            "역사 인물 세계사 한국사",
            "교육 학교 대학 학습 공부",
        ],
        "reddit_keywords": ["environment", "volunteering", "history", "politics", "social issues", "education", "human rights", "news", "culture"],
        "parent": "정치·사회",
    },
}

parent_category_keywords = {
    "게임·엔터": (
        CATEGORY_DATA["비디오게임"]["keywords"] +
        CATEGORY_DATA["보드게임·취미"]["keywords"] +
        CATEGORY_DATA["예능·코미디"]["keywords"]
    ),
    "과학·기술": (
        CATEGORY_DATA["과학·자연"]["keywords"] +
        CATEGORY_DATA["기술·개발"]["keywords"]
    ),
    "경제·경영": CATEGORY_DATA["경제·비즈니스"]["keywords"],
    "문화·예술": CATEGORY_DATA["문화·예술"]["keywords"],
    "건강·라이프": (
        CATEGORY_DATA["스포츠·운동"]["keywords"] +
        CATEGORY_DATA["건강·웰빙"]["keywords"]
    ),
    "음식·여행": (
        CATEGORY_DATA["음식·요리"]["keywords"] +
        CATEGORY_DATA["여행·탐험"]["keywords"]
    ),
    "정치·사회": CATEGORY_DATA["사회·정치"]["keywords"],
}

KEYWORD_POOL = [kw for d in CATEGORY_DATA.values() for kw in d["keywords"]]
REDDIT_KEYWORD_POOL = {cat: d["reddit_keywords"] for cat, d in CATEGORY_DATA.items()}
category_keywords = {cat: d["keywords"] for cat, d in CATEGORY_DATA.items()}

category_embeddings = {
    cat: np.mean(model.encode(d["keywords"]), axis=0)
    for cat, d in CATEGORY_DATA.items()
}
parent_category_embeddings = {
    cat: np.mean(model.encode(kws), axis=0)
    for cat, kws in parent_category_keywords.items()
}

# ✅ 커뮤니티 편향 비교용 평균 프로파일 (글로벌 기준)
# 각 카테고리가 균등하게 분포된 "이상적인 균형" 벡터
COMMUNITY_PROFILE = np.mean(list(category_embeddings.values()), axis=0)


def is_quality_text(text: str, min_length: int = 10) -> bool:
    """텍스트 품질 필터 - 너무 짧거나 의미없는 텍스트 차단"""
    if not text:
        return False
    cleaned = text.strip()
    if len(cleaned) < min_length:
        return False
    if cleaned in ["분석 실패", "분석실패", "error", "Error", "None", "null"]:
        return False
    # 한글 또는 영문 단어가 최소 2개 이상 있어야 함
    korean_words = len([w for w in cleaned.split() if any('가' <= c <= '힣' for c in w)])
    english_words = len([w for w in cleaned.split() if w.isalpha() and len(w) > 2])
    return (korean_words + english_words) >= 2

# SerpAPI 캐시
serpapi_cache = {}

def get_user_file(user_id: str):
    safe_id = user_id.replace("/", "_").replace("\\", "_").replace(":", "_")
    return f"user_data_{safe_id}.json"

def load_data(user_id: str = "user_default"):
    file = get_user_file(user_id)
    if os.path.exists(file):
        try:
            with open(file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, Exception) as e:
            print(f"⚠️ 데이터 파일 손상 - 초기화: {e}")
            try:
                os.rename(file, file + ".broken")
            except:
                pass
    return {
        "vectors": [], "history": [],
        "youtube_vectors": [], "youtube_history": [],
        "reddit_vectors": [], "reddit_history": [],
        "analyzed_texts": [], "used_keywords": [],
        "last_anti_keywords": [], "last_source_type": "youtube",
        "category_log": [],
        "youtube_category_log": [],
        "reddit_category_log": [],
    }

def save_data(data, user_id: str = "user_default"):
    file = get_user_file(user_id)
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

def is_naver_news(url): return 'news.naver.com' in url or 'n.news.naver.com' in url
def is_naver_blog(url): return 'blog.naver.com' in url or 'm.blog.naver.com' in url
def is_youtube(url): return 'youtube.com' in url or 'youtu.be' in url
def is_reddit(url): return 'reddit.com' in url or 'redd.it' in url

def extract_youtube_id(url):
    patterns = [r'(?:v=|\/)([0-9A-Za-z_-]{11})', r'youtu\.be\/([0-9A-Za-z_-]{11})', r'shorts\/([0-9A-Za-z_-]{11})']
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
                print(f"YouTube 분석: {title}")
                return f"{title} {description} {tags}"
        except Exception as e:
            print(f"YouTube API 오류: {e}")
    return None

# ✅ 서브레딧 → (카테고리명, 키워드) 매핑 - 500개 확장
# 카테고리: 비디오게임/보드게임·취미/예능·코미디/스포츠·운동/건강·웰빙/음식·요리/여행·탐험/과학·자연/기술·개발/문화·예술/경제·비즈니스/사회·정치
SUBREDDIT_CATEGORY_MAP = {
    # ===== 비디오게임 =====
    'gaming': ('비디오게임', '비디오게임 콘솔 플레이 게임 스팀'),
    'pcgaming': ('비디오게임', 'PC게임 스팀 온라인 멀티플레이'),
    'games': ('비디오게임', '비디오게임 RPG FPS 어드벤처'),
    'ps5': ('비디오게임', '플레이스테이션 콘솔 소니 게임'),
    'xbox': ('비디오게임', 'Xbox 마이크로소프트 콘솔 게임'),
    'nintendo': ('비디오게임', '닌텐도 스위치 마리오 젤다'),
    'leagueoflegends': ('비디오게임', 'e스포츠 리그오브레전드 MOBA 게임'),
    'valorant': ('비디오게임', 'FPS 슈팅게임 밸로란트 택티컬'),
    'minecraft': ('비디오게임', '마인크래프트 샌드박스 크래프트 빌딩'),
    'fortnite': ('비디오게임', '배틀로얄 포트나이트 FPS 슈팅'),
    'apexlegends': ('비디오게임', '배틀로얄 FPS 에이펙스 슈팅'),
    'overwatch': ('비디오게임', '오버워치 FPS 팀플레이 블리자드'),
    'genshin_impact': ('비디오게임', '원신 RPG 가챠 애니메이션 게임'),
    'worldofwarcraft': ('비디오게임', 'MMORPG 월드오브워크래프트 블리자드'),
    'ffxiv': ('비디오게임', 'MMORPG 파이널판타지 RPG 게임'),
    'diablo': ('비디오게임', '디아블로 RPG 액션 블리자드'),
    'pathofexile': ('비디오게임', 'RPG 액션 인디 게임'),
    'dota2': ('비디오게임', 'e스포츠 MOBA 도타 게임'),
    'smite': ('비디오게임', 'MOBA 게임 전략'),
    'rocketleague': ('비디오게임', '로켓리그 스포츠 게임 자동차'),
    'elderscrollsonline': ('비디오게임', 'MMORPG RPG 스카이림 게임'),
    'skyrim': ('비디오게임', 'RPG 오픈월드 스카이림 판타지'),
    'witcher': ('비디오게임', 'RPG 오픈월드 위쳐 판타지'),
    'cyberpunkgame': ('비디오게임', 'RPG 사이버펑크 오픈월드 미래'),
    'eldenring': ('비디오게임', 'RPG 소울라이크 엘든링 판타지'),
    'darksouls': ('비디오게임', 'RPG 소울라이크 다크소울 도전'),
    'zelda': ('비디오게임', '젤다 닌텐도 RPG 어드벤처'),
    'pokemon': ('비디오게임', '포켓몬 닌텐도 게임 RPG'),
    'indiegaming': ('비디오게임', '인디게임 독립 스팀 개발'),
    'gamedev': ('비디오게임', '게임개발 인디 유니티 언리얼'),
    'retrogaming': ('비디오게임', '레트로게임 복고 클래식 아케이드'),
    'emulation': ('비디오게임', '에뮬레이터 레트로 클래식 게임'),
    'speedrun': ('비디오게임', '스피드런 게임 챌린지 기록'),
    'streamersgossip': ('비디오게임', '스트리머 게임방송 트위치 유튜브'),
    'twitch': ('비디오게임', '트위치 스트리밍 게임방송 라이브'),
    'competitivegaming': ('비디오게임', 'e스포츠 경쟁 프로게이머 게임'),

    # ===== 보드게임·취미 =====
    'boardgames': ('보드게임·취미', '보드게임 테이블 전략 규칙 카드'),
    'chess': ('보드게임·취미', '체스 두뇌게임 전략 경쟁'),
    'magicthegathering': ('보드게임·취미', 'MTG 카드게임 판타지 전략'),
    'hearthstone': ('보드게임·취미', '하스스톤 카드게임 블리자드 전략'),
    'dnd': ('보드게임·취미', 'TTRPG 던전앤드래곤 역할극 판타지'),
    'rpg': ('보드게임·취미', 'TTRPG 역할극 판타지 보드게임'),
    'warhammer': ('보드게임·취미', '워해머 미니어처 전략 보드게임'),
    'warhammer40k': ('보드게임·취미', '워해머 SF 미니어처 전략'),
    'lego': ('보드게임·취미', '레고 조립 블록 창작 취미'),
    'modeltrains': ('보드게임·취미', '모형기차 철도 레이아웃 취미'),
    'minipainting': ('보드게임·취미', '미니어처 페인팅 취미 워해머'),
    'puzzles': ('보드게임·취미', '퍼즐 두뇌 조각 취미'),
    'origami': ('보드게임·취미', '종이접기 오리가미 공예 취미'),
    'mildlyinteresting': ('보드게임·취미', '일상 흥미 취미 발견'),
    'hobbies': ('보드게임·취미', '취미 여가 활동 관심사'),

    # ===== 예능·코미디 =====
    'funny': ('예능·코미디', '코미디 유머 웃음 예능 밈'),
    'memes': ('예능·코미디', '밈 유머 인터넷 코미디 짤'),
    'dankmemes': ('예능·코미디', '밈 유머 인터넷 코미디'),
    'me_irl': ('예능·코미디', '밈 일상 유머 공감'),
    'humor': ('예능·코미디', '유머 웃음 코미디 예능'),
    'entertainment': ('예능·코미디', '엔터테인먼트 예능 방송 쇼'),
    'television': ('예능·코미디', 'TV 드라마 시트콤 예능'),
    'standupcomedy': ('예능·코미디', '스탠드업 코미디 공연 개그'),
    'comedyheaven': ('예능·코미디', '코미디 유머 밈 웃음'),
    'videos': ('예능·코미디', '영상 예능 바이럴 엔터'),
    'unexpected': ('예능·코미디', '반전 서프라이즈 예능 영상'),
    'maybemaybemaybe': ('예능·코미디', '반전 영상 서프라이즈 유머'),
    'perfectlycutscreams': ('예능·코미디', '코미디 영상 유머 반응'),
    'blunder': ('예능·코미디', '실수 유머 코미디 영상'),
    'therewasanattempt': ('예능·코미디', '실패 유머 코미디 영상'),
    'lostredditors': ('예능·코미디', '밈 유머 코미디'),
    'fellowkids': ('예능·코미디', '밈 유머 공감 세대'),
    'cursedcomments': ('예능·코미디', '밈 유머 인터넷 코미디'),
    'shitposting': ('예능·코미디', '밈 유머 인터넷 포스팅'),
    'absoluteunits': ('예능·코미디', '밈 유머 사이즈 코미디'),

    # ===== 스포츠·운동 =====
    'sports': ('스포츠·운동', '스포츠 경기 선수 팀 운동'),
    'soccer': ('스포츠·운동', '축구 월드컵 리그 선수 팀'),
    'football': ('스포츠·운동', '미식축구 NFL 풋볼 스포츠'),
    'nfl': ('스포츠·운동', 'NFL 미식축구 아메리칸풋볼 팀'),
    'nba': ('스포츠·운동', 'NBA 농구 선수 팀 경기'),
    'baseball': ('스포츠·운동', '야구 MLB 홈런 투수 타자'),
    'mlb': ('스포츠·운동', 'MLB 야구 메이저리그 선수'),
    'nhl': ('스포츠·운동', 'NHL 아이스하키 퍽 팀'),
    'tennis': ('스포츠·운동', '테니스 그랜드슬램 선수 라켓'),
    'golf': ('스포츠·운동', '골프 필드 홀인원 PGA'),
    'mma': ('스포츠·운동', 'MMA 격투기 UFC 복싱 무술'),
    'ufc': ('스포츠·운동', 'UFC MMA 격투기 챔피언'),
    'boxing': ('스포츠·운동', '복싱 격투 챔피언 헤비급'),
    'cycling': ('스포츠·운동', '자전거 사이클링 MTB 라이딩'),
    'running': ('스포츠·운동', '러닝 마라톤 조깅 달리기'),
    'swimming': ('스포츠·운동', '수영 다이빙 수상스포츠'),
    'weightlifting': ('스포츠·운동', '역도 웨이트 바벨 파워리프팅'),
    'crossfit': ('스포츠·운동', '크로스핏 트레이닝 운동 헬스'),
    'fitness': ('스포츠·운동', '피트니스 헬스 운동 트레이닝 근육'),
    'bodybuilding': ('스포츠·운동', '보디빌딩 근육 벌크업 헬스'),
    'loseit': ('스포츠·운동', '다이어트 체중감량 운동 건강'),
    'xxfitness': ('스포츠·운동', '여성 피트니스 운동 건강'),
    'skateboarding': ('스포츠·운동', '스케이트보드 익스트림 트릭'),
    'surfing': ('스포츠·운동', '서핑 파도 해양스포츠 보드'),
    'snowboarding': ('스포츠·운동', '스노보드 겨울스포츠 슬로프'),
    'skiing': ('스포츠·운동', '스키 겨울스포츠 슬로프 알파인'),
    'climbing': ('스포츠·운동', '클라이밍 암벽등반 볼더링'),
    'martialarts': ('스포츠·운동', '무술 격투기 유도 태권도'),
    'formula1': ('스포츠·운동', 'F1 포뮬러원 레이싱 자동차'),
    'motorsport': ('스포츠·운동', '모터스포츠 레이싱 자동차 경주'),

    # ===== 건강·웰빙 =====
    'yoga': ('건강·웰빙', '요가 명상 유연성 스트레칭 웰빙'),
    'meditation': ('건강·웰빙', '명상 마음챙김 스트레스 마인드풀니스'),
    'hiking': ('건강·웰빙', '하이킹 등산 트레킹 아웃도어 자연'),
    'camping': ('건강·웰빙', '캠핑 아웃도어 텐트 자연 백패킹'),
    'backpacking': ('건강·웰빙', '백패킹 하이킹 트레킹 아웃도어'),
    'mentalhealth': ('건강·웰빙', '정신건강 우울증 불안 상담 치료'),
    'anxiety': ('건강·웰빙', '불안 공황 정신건강 치료 상담'),
    'depression': ('건강·웰빙', '우울증 정신건강 치료 회복'),
    'stopdrinking': ('건강·웰빙', '금주 알코올 건강 회복 생활'),
    'quittingsmoking': ('건강·웰빙', '금연 흡연 건강 회복'),
    'sleep': ('건강·웰빙', '수면 불면증 수면건강 휴식'),
    'veganfitness': ('건강·웰빙', '비건 채식 피트니스 건강'),
    'nutrition': ('건강·웰빙', '영양 식단 건강 다이어트 비타민'),
    'keto': ('건강·웰빙', '키토 저탄고지 다이어트 건강식'),
    'intermittentfasting': ('건강·웰빙', '간헐적 단식 다이어트 건강'),
    'selfimprovement': ('건강·웰빙', '자기계발 습관 성장 목표 생산성'),
    'decidingtobebetter': ('건강·웰빙', '자기계발 성장 목표 습관'),
    'productivity': ('건강·웰빙', '생산성 집중 시간관리 효율'),
    'getmotivated': ('건강·웰빙', '동기부여 목표 성취 의지'),
    'nature': ('건강·웰빙', '자연 생태 아웃도어 환경 풍경'),
    'earthporn': ('건강·웰빙', '자연 풍경 경관 지구 여행'),
    'gardening': ('건강·웰빙', '정원 원예 식물 재배 자연'),
    'plants': ('건강·웰빙', '식물 화분 원예 자연 인테리어'),
    'wildcamping': ('건강·웰빙', '야영 캠핑 자연 아웃도어'),
    'ultralight': ('건강·웰빙', '경량 백패킹 하이킹 아웃도어'),

    # ===== 음식·요리 =====
    'food': ('음식·요리', '음식 맛있는 레시피 요리 먹방'),
    'cooking': ('음식·요리', '요리 레시피 조리법 홈쿡 식재료'),
    'recipes': ('음식·요리', '레시피 요리법 음식 만들기'),
    'foodporn': ('음식·요리', '음식 사진 맛있는 레스토랑 요리'),
    'eatinghealthy': ('음식·요리', '건강식 샐러드 영양 다이어트'),
    'mealprep': ('음식·요리', '밀프렙 식단준비 요리 건강식'),
    'baking': ('음식·요리', '제과제빵 케이크 빵 디저트 쿠키'),
    'bread': ('음식·요리', '빵 베이킹 사워도우 제빵'),
    'pizza': ('음식·요리', '피자 이탈리안 요리 치즈'),
    'ramen': ('음식·요리', '라면 라멘 일본 국수 요리'),
    'sushi': ('음식·요리', '스시 초밥 일본 해산물 요리'),
    'coffee': ('음식·요리', '커피 카페 에스프레소 바리스타'),
    'tea': ('음식·요리', '차 홍차 녹차 카페 음료'),
    'cocktails': ('음식·요리', '칵테일 주류 믹솔로지 바'),
    'beer': ('음식·요리', '맥주 크래프트 홉 양조'),
    'wine': ('음식·요리', '와인 포도주 소믈리에 양조'),
    'whisky': ('음식·요리', '위스키 증류주 싱글몰트 주류'),
    'grilling': ('음식·요리', '그릴 바베큐 BBQ 굽기 고기'),
    'BBQ': ('음식·요리', '바베큐 그릴 고기 훈제 요리'),
    'vegan': ('음식·요리', '비건 채식 식물성 건강 요리'),
    'vegetarian': ('음식·요리', '채식 야채 건강 요리 식단'),
    'asianfood': ('음식·요리', '아시안 요리 중식 일식 한식'),
    'koreanfood': ('음식·요리', '한식 김치 불고기 한국 요리'),
    'japanesefood': ('음식·요리', '일식 라멘 스시 일본 요리'),
    'chinesefood': ('음식·요리', '중식 볶음밥 딤섬 중국 요리'),
    'mexicanfood': ('음식·요리', '멕시칸 타코 부리토 살사'),
    'italianfood': ('음식·요리', '이탈리안 파스타 피자 리조또'),
    'IndianFood': ('음식·요리', '인도 커리 난 탄두리 향신료'),
    'restaurants': ('음식·요리', '레스토랑 맛집 음식점 다이닝'),
    'streetfood': ('음식·요리', '길거리음식 분식 푸드트럭 간식'),
    'snacks': ('음식·요리', '간식 스낵 과자 먹거리'),
    'dessert': ('음식·요리', '디저트 케이크 아이스크림 달콤'),
    'icecream': ('음식·요리', '아이스크림 디저트 달콤 냉동'),
    'chocolate': ('음식·요리', '초콜릿 디저트 카카오 달콤'),

    # ===== 여행·탐험 =====
    'travel': ('여행·탐험', '여행 해외 관광 항공 숙박'),
    'solotravel': ('여행·탐험', '혼자여행 솔로트립 자유여행 배낭'),
    'backpacker': ('여행·탐험', '배낭여행 저예산 자유여행 글로벌'),
    'digitalnomad': ('여행·탐험', '디지털노마드 원격근무 여행 자유'),
    'travelphotos': ('여행·탐험', '여행사진 풍경 관광 세계'),
    'expats': ('여행·탐험', '해외거주 이민 외국생활 문화'),
    'living_in_korea_now': ('여행·탐험', '한국생활 한국여행 서울 문화'),
    'living_in_japan': ('여행·탐험', '일본생활 일본여행 도쿄 문화'),
    'korea': ('여행·탐험', '한국 서울 문화 여행 관광'),
    'japan': ('여행·탐험', '일본 도쿄 문화 여행 관광'),
    'europe': ('여행·탐험', '유럽 여행 관광 문화 역사'),
    'australia': ('여행·탐험', '호주 여행 관광 시드니 멜버른'),
    'canada': ('여행·탐험', '캐나다 여행 관광 토론토 밴쿠버'),
    'usa': ('여행·탐험', '미국 여행 관광 뉴욕 LA'),
    'southeastasia': ('여행·탐험', '동남아시아 여행 태국 베트남'),
    'thailand': ('여행·탐험', '태국 방콕 치앙마이 여행 관광'),
    'vietnam': ('여행·탐험', '베트남 하노이 호치민 여행'),
    'indonesia': ('여행·탐험', '인도네시아 발리 자카르타 여행'),
    'roadtrip': ('여행·탐험', '로드트립 자동차여행 드라이브'),
    'vanlife': ('여행·탐험', '밴라이프 캠핑카 노마드 여행'),
    'urbanism': ('여행·탐험', '도시 도시계획 거리 건축'),
    'cityporn': ('여행·탐험', '도시 풍경 야경 건축 관광'),
    'architectureporn': ('여행·탐험', '건축 디자인 도시 공간'),
    'abandonedporn': ('여행·탐험', '폐허 탐험 역사 건물'),
    'geocaching': ('여행·탐험', '지오캐싱 보물찾기 야외 탐험'),

    # ===== 과학·자연 =====
    'science': ('과학·자연', '과학 연구 논문 실험 발견'),
    'space': ('과학·자연', '우주 천문학 NASA 행성 별'),
    'astronomy': ('과학·자연', '천문학 별자리 망원경 우주'),
    'nasa': ('과학·자연', 'NASA 우주 로켓 탐사'),
    'physics': ('과학·자연', '물리학 양자역학 상대성 이론'),
    'chemistry': ('과학·자연', '화학 원소 반응 실험 분자'),
    'biology': ('과학·자연', '생물학 진화 세포 유전자 생태'),
    'geology': ('과학·자연', '지질학 암석 화석 지구 광물'),
    'oceanography': ('과학·자연', '해양학 바다 심해 해류 생태'),
    'meteorology': ('과학·자연', '기상학 날씨 기후 폭풍 예보'),
    'askscience': ('과학·자연', '과학 질문 연구 실험 이론'),
    'todayilearned': ('과학·자연', '지식 학습 발견 과학 역사'),
    'interestingasfuck': ('과학·자연', '흥미 발견 지식 과학 놀라운'),
    'woahdude': ('과학·자연', '놀라운 시각 착시 과학 자연'),
    'natureisfuckinglit': ('과학·자연', '자연 생태 동물 식물 경이'),
    'awwnature': ('과학·자연', '동물 자연 귀여운 생태'),
    'animals': ('과학·자연', '동물 애완 자연 생태 포유류'),
    'wildlife': ('과학·자연', '야생동물 자연 생태 포식자'),
    'birds': ('과학·자연', '새 조류 탐조 자연 생태'),
    'whales': ('과학·자연', '고래 해양동물 자연 생태'),
    'sharks': ('과학·자연', '상어 해양 자연 생태 바다'),
    'insects': ('과학·자연', '곤충 자연 생태 관찰'),
    'botany': ('과학·자연', '식물학 꽃 나무 자연 생태'),
    'mycology': ('과학·자연', '균류 버섯 자연 생태'),
    'fossilid': ('과학·자연', '화석 고생물 공룡 지질 역사'),
    'dinosaurs': ('과학·자연', '공룡 고생물 화석 진화 역사'),
    'evolution': ('과학·자연', '진화론 생물 과학 자연선택'),
    'climate': ('과학·자연', '기후변화 온난화 환경 과학'),
    'environment': ('과학·자연', '환경 생태 보존 자연 지속가능'),
    'sustainability': ('과학·자연', '지속가능 환경 재활용 녹색'),
    'medicine': ('과학·자연', '의학 건강 치료 연구 임상'),
    'neuroscience': ('과학·자연', '신경과학 뇌 심리 인지'),
    'cogsci': ('과학·자연', '인지과학 심리 뇌 행동'),

    # ===== 기술·개발 =====
    'technology': ('기술·개발', '기술 IT 혁신 소프트웨어 디지털'),
    'programming': ('기술·개발', '프로그래밍 코딩 개발 소프트웨어'),
    'python': ('기술·개발', '파이썬 프로그래밍 코딩 데이터'),
    'javascript': ('기술·개발', '자바스크립트 웹개발 프론트엔드'),
    'java': ('기술·개발', '자바 프로그래밍 백엔드 개발'),
    'cpp': ('기술·개발', 'C++ 프로그래밍 시스템 개발'),
    'rust': ('기술·개발', '러스트 프로그래밍 시스템 개발'),
    'golang': ('기술·개발', 'Go 프로그래밍 백엔드 서버'),
    'webdev': ('기술·개발', '웹개발 프론트엔드 백엔드 HTML'),
    'reactjs': ('기술·개발', 'React 프론트엔드 웹개발 UI'),
    'vuejs': ('기술·개발', 'Vue 프론트엔드 웹개발 JS'),
    'node': ('기술·개발', 'Node.js 백엔드 서버 자바스크립트'),
    'learnprogramming': ('기술·개발', '프로그래밍 학습 코딩 입문'),
    'cscareerquestions': ('기술·개발', 'IT 취업 커리어 개발자 소프트웨어'),
    'devops': ('기술·개발', 'DevOps 클라우드 배포 자동화'),
    'aws': ('기술·개발', 'AWS 클라우드 서버 인프라'),
    'docker': ('기술·개발', '도커 컨테이너 클라우드 배포'),
    'kubernetes': ('기술·개발', '쿠버네티스 컨테이너 오케스트레이션'),
    'machinelearning': ('기술·개발', '머신러닝 인공지능 딥러닝 데이터'),
    'artificialintelligence': ('기술·개발', '인공지능 AI 머신러닝 자동화'),
    'deeplearning': ('기술·개발', '딥러닝 신경망 AI 모델'),
    'datascience': ('기술·개발', '데이터사이언스 분석 통계 머신러닝'),
    'openai': ('기술·개발', 'OpenAI ChatGPT AI 언어모델'),
    'chatgpt': ('기술·개발', 'ChatGPT AI 언어모델 자동화'),
    'cybersecurity': ('기술·개발', '사이버보안 해킹 보안 네트워크'),
    'hacking': ('기술·개발', '해킹 보안 취약점 침투테스트'),
    'netsec': ('기술·개발', '네트워크 보안 방화벽 암호화'),
    'privacy': ('기술·개발', '프라이버시 보안 개인정보 VPN'),
    'linux': ('기술·개발', '리눅스 서버 운영체제 오픈소스'),
    'unix': ('기술·개발', '유닉스 리눅스 서버 시스템'),
    'homelab': ('기술·개발', '홈랩 서버 네트워크 취미 IT'),
    'selfhosted': ('기술·개발', '셀프호스팅 서버 자체 운영'),
    'startups': ('기술·개발', '스타트업 창업 IT 벤처 투자'),
    'entrepreneur': ('기술·개발', '창업 기업가 스타트업 사업'),
    'apple': ('기술·개발', '애플 아이폰 맥 iOS 기술'),
    'android': ('기술·개발', '안드로이드 스마트폰 앱 구글'),
    'iphone': ('기술·개발', '아이폰 애플 iOS 스마트폰'),
    'gadgets': ('기술·개발', '가젯 기기 전자제품 리뷰'),
    'hardware': ('기술·개발', '하드웨어 컴퓨터 부품 조립'),
    'buildapc': ('기술·개발', '컴퓨터 조립 PC 부품 하드웨어'),
    'electricvehicles': ('기술·개발', '전기차 EV 테슬라 충전 미래'),
    'teslamotors': ('기술·개발', '테슬라 전기차 자율주행 일론머스크'),
    'futurology': ('기술·개발', '미래기술 로봇 AI 자동화 혁신'),
    'singularity': ('기술·개발', '기술특이점 AI 미래 자동화'),

    # ===== 문화·예술 =====
    'music': ('문화·예술', '음악 밴드 아티스트 앨범 공연'),
    'hiphopheads': ('문화·예술', '힙합 랩 비트 음악 문화'),
    'rnb': ('문화·예술', 'R&B 소울 음악 아티스트'),
    'electronicmusic': ('문화·예술', '일렉트로닉 EDM DJ 음악'),
    'classicalmusic': ('문화·예술', '클래식 오케스트라 교향곡 음악'),
    'jazz': ('문화·예술', '재즈 즉흥 연주 스윙 블루스'),
    'metal': ('문화·예술', '헤비메탈 록 밴드 기타 음악'),
    'punk': ('문화·예술', '펑크 록 밴드 저항 음악'),
    'indiemusic': ('문화·예술', '인디음악 독립 밴드 언더그라운드'),
    'kpop': ('문화·예술', 'K팝 아이돌 한류 팬덤 음악'),
    'popheads': ('문화·예술', '팝 음악 아티스트 차트 히트'),
    'movies': ('문화·예술', '영화 감독 배우 리뷰 블록버스터'),
    'film': ('문화·예술', '영화 필름 시네마 감독 예술'),
    'criterion': ('문화·예술', '아트하우스 영화 감독 예술'),
    'horror': ('문화·예술', '공포 호러 영화 스릴러'),
    'scifi': ('문화·예술', 'SF 공상과학 영화 소설'),
    'fantasy': ('문화·예술', '판타지 마법 드래곤 소설 영화'),
    'television': ('문화·예술', 'TV 드라마 시리즈 넷플릭스 방송'),
    'netflix': ('문화·예술', '넷플릭스 드라마 영화 스트리밍'),
    'anime': ('문화·예술', '애니메이션 만화 일본 서브컬처'),
    'manga': ('문화·예술', '만화 웹툰 일본 서브컬처 그림'),
    'webtoons': ('문화·예술', '웹툰 만화 한국 디지털 그림'),
    'art': ('문화·예술', '미술 그림 일러스트 갤러리 예술'),
    'drawing': ('문화·예술', '드로잉 스케치 그림 일러스트'),
    'painting': ('문화·예술', '페인팅 수채화 유화 미술'),
    'digitalart': ('문화·예술', '디지털아트 일러스트 CG 그래픽'),
    'photography': ('문화·예술', '사진 카메라 촬영 풍경 인물'),
    'itookapicture': ('문화·예술', '사진 촬영 풍경 일상 카메라'),
    'streetphotography': ('문화·예술', '거리사진 도시 사진 촬영'),
    'fashion': ('문화·예술', '패션 의류 스타일 트렌드 브랜드'),
    'malefashionadvice': ('문화·예술', '남성패션 의류 스타일 코디'),
    'femalefashionadvice': ('문화·예술', '여성패션 의류 스타일 코디'),
    'sneakers': ('문화·예술', '스니커즈 신발 컬렉션 패션'),
    'streetwear': ('문화·예술', '스트리트웨어 패션 힙합 문화'),
    'books': ('문화·예술', '독서 소설 문학 책 작가'),
    'literature': ('문화·예술', '문학 소설 시 작가 독서'),
    'writing': ('문화·예술', '글쓰기 소설 창작 작가 문학'),
    'poetry': ('문화·예술', '시 시집 문학 감성 글쓰기'),
    'theater': ('문화·예술', '연극 뮤지컬 무대 공연 예술'),
    'dance': ('문화·예술', '댄스 안무 공연 예술 문화'),

    # ===== 경제·비즈니스 =====
    'investing': ('경제·비즈니스', '투자 주식 펀드 배당 자산'),
    'stocks': ('경제·비즈니스', '주식 증권 시장 트레이딩'),
    'wallstreetbets': ('경제·비즈니스', '주식 옵션 트레이딩 투기 시장'),
    'personalfinance': ('경제·비즈니스', '개인금융 재테크 저축 가계부'),
    'frugal': ('경제·비즈니스', '절약 저축 가계부 소비 생활'),
    'financialindependence': ('경제·비즈니스', '경제적자유 FIRE 투자 저축'),
    'cryptocurrency': ('경제·비즈니스', '암호화폐 비트코인 이더리움 블록체인'),
    'bitcoin': ('경제·비즈니스', '비트코인 암호화폐 블록체인 투자'),
    'ethereum': ('경제·비즈니스', '이더리움 암호화폐 DeFi 블록체인'),
    'realestate': ('경제·비즈니스', '부동산 아파트 임대 투자 매매'),
    'business': ('경제·비즈니스', '비즈니스 사업 경영 마케팅'),
    'marketing': ('경제·비즈니스', '마케팅 광고 브랜딩 소셜미디어'),
    'sales': ('경제·비즈니스', '영업 판매 세일즈 비즈니스'),
    'smallbusiness': ('경제·비즈니스', '소규모사업 창업 자영업 운영'),
    'ecommerce': ('경제·비즈니스', '이커머스 온라인쇼핑 판매 창업'),
    'dropshipping': ('경제·비즈니스', '드롭쉬핑 이커머스 온라인 판매'),
    'affiliatemarketing': ('경제·비즈니스', '제휴마케팅 수익화 블로그 광고'),
    'passiveincome': ('경제·비즈니스', '수동소득 투자 배당 사업'),
    'sidehustle': ('경제·비즈니스', '부업 수입 사이드잡 돈벌기'),
    'jobs': ('경제·비즈니스', '취업 구직 이직 커리어 직장'),
    'careerguidance': ('경제·비즈니스', '커리어 직업 이직 취업 성장'),
    'economics': ('경제·비즈니스', '경제학 거시 미시 금리 인플레이션'),
    'economics': ('경제·비즈니스', '경제 금융 시장 정책 성장'),
    'accounting': ('경제·비즈니스', '회계 세무 재무 감사 장부'),
    'tax': ('경제·비즈니스', '세금 세무 납세 환급 절세'),

    # ===== 사회·정치 =====
    'worldnews': ('사회·정치', '세계뉴스 국제 시사 정치 사건'),
    'news': ('사회·정치', '뉴스 시사 사건 사고 미디어'),
    'politics': ('사회·정치', '정치 정책 선거 의회 정부'),
    'usnews': ('사회·정치', '미국뉴스 미국정치 시사 사건'),
    'ukpolitics': ('사회·정치', '영국정치 브렉시트 의회 총리'),
    'geopolitics': ('사회·정치', '지정학 국제관계 외교 안보'),
    'history': ('사회·정치', '역사 세계사 전쟁 문명 인물'),
    'todayinhistory': ('사회·정치', '역사 오늘의역사 사건 기념일'),
    'askhistorians': ('사회·정치', '역사 질문 연구 학술 고증'),
    'education': ('사회·정치', '교육 학교 대학 학습 입시'),
    'teachers': ('사회·정치', '교사 교육 학교 수업 학생'),
    'college': ('사회·정치', '대학 캠퍼스 학점 전공 진학'),
    'socialissues': ('사회·정치', '사회문제 인권 평등 차별 복지'),
    'feminism': ('사회·정치', '페미니즘 여성인권 평등 사회'),
    'lgbt': ('사회·정치', 'LGBT 성소수자 인권 평등 다양성'),
    'blacklivesmatter': ('사회·정치', '인종차별 인권 평등 사회운동'),
    'climate': ('사회·정치', '기후변화 환경정책 탄소 지구온난화'),
    'environment': ('사회·정치', '환경보호 생태 탄소 지속가능'),
    'volunteer': ('사회·정치', '봉사활동 나눔 사회공헌 커뮤니티'),
    'philosophy': ('사회·정치', '철학 윤리 논리 사상 인문학'),
    'ethics': ('사회·정치', '윤리 도덕 가치관 사회 철학'),
    'religion': ('사회·정치', '종교 신앙 신학 문화 역사'),
    'atheism': ('사회·정치', '무신론 종교 철학 세계관'),
    'law': ('사회·정치', '법률 법학 판례 소송 권리'),
    'legaladvice': ('사회·정치', '법률상담 권리 규정 계약'),
    'immigration': ('사회·정치', '이민 비자 국적 해외이주 정책'),
    'sociology': ('사회·정치', '사회학 사회현상 문화 집단'),
    'psychology': ('사회·정치', '심리학 행동 인지 상담 치료'),
    'changemyview': ('사회·정치', '토론 논쟁 의견 설득 사회'),
    'unpopularopinion': ('사회·정치', '의견 논쟁 사회 문화 토론'),
    'askreddit': ('사회·정치', '질문 토론 의견 일상 사회'),
    'seoul': ('여행·탐험', '서울 한국 도시 관광 문화 일상'),
    'korea': ('여행·탐험', '한국 서울 문화 생활 관광'),
    'japan': ('여행·탐험', '일본 도쿄 문화 생활 관광'),
    'china': ('여행·탐험', '중국 베이징 상하이 문화 여행'),
}

# 하위 호환성을 위해 SUBREDDIT_KEYWORD_MAP도 유지
SUBREDDIT_KEYWORD_MAP = {k: v[1] for k, v in SUBREDDIT_CATEGORY_MAP.items()}

def extract_subreddit_from_url(url: str) -> str:
    """URL에서 서브레딧 이름 추출"""
    match = re.search(r'reddit\.com/r/([^/?\s]+)', url)
    return match.group(1).lower() if match else ''

def get_reddit_fallback_text(url: str) -> str:
    """
    EC2에서 Reddit 직접 접근 실패 시
    URL의 서브레딧으로 카테고리 키워드 생성
    """
    subreddit = extract_subreddit_from_url(url)
    if not subreddit:
        return None

    # 정확한 매핑 먼저 확인
    if subreddit in SUBREDDIT_KEYWORD_MAP:
        keywords = SUBREDDIT_KEYWORD_MAP[subreddit]
        print(f"서브레딧 매핑 사용: r/{subreddit} → {keywords[:50]}")
        return f"r/{subreddit} {keywords}"

    # 부분 매핑 (예: leagueoflegends → gaming 키워드)
    for key, keywords in SUBREDDIT_KEYWORD_MAP.items():
        if key in subreddit or subreddit in key:
            print(f"서브레딧 부분 매핑: r/{subreddit} → {key}")
            return f"r/{subreddit} {keywords}"

    # ✅ 서브레딧 이름에서 의미있는 단어 추출 후 키워드 매핑
    # 예: living_in_korea_now → living korea → 여행/문화
    # 예: camping_by_stream → camping → 건강/웰빙
    sub_words = re.split(r'[_\-\s]+', subreddit.lower())
    
    travel_words = ['korea', 'japan', 'travel', 'living', 'expat', 'abroad', 'city', 'country', 'visit', 'trip']
    food_words = ['food', 'cook', 'recipe', 'eat', 'meal', 'restaurant', 'kitchen', 'baking', 'coffee', 'tea', 'wine', 'beer']
    camping_words = ['camping', 'camp', 'outdoor', 'hiking', 'nature', 'forest', 'mountain', 'trail', 'backpack']
    game_words = ['game', 'gaming', 'play', 'steam', 'console', 'pc', 'rpg', 'fps']
    tech_words = ['tech', 'code', 'dev', 'software', 'program', 'ai', 'ml', 'data', 'web']
    sport_words = ['sport', 'fitness', 'gym', 'run', 'swim', 'soccer', 'basketball', 'football']
    art_words = ['art', 'music', 'photo', 'film', 'movie', 'draw', 'paint', 'craft', 'fashion']
    
    detected_keywords = []
    for word in sub_words:
        if any(w in word for w in travel_words):
            detected_keywords.append('여행 탐험 해외 관광 문화')
        if any(w in word for w in food_words):
            detected_keywords.append('음식 요리 레시피 맛집')
        if any(w in word for w in camping_words):
            detected_keywords.append('캠핑 아웃도어 하이킹 자연')
        if any(w in word for w in game_words):
            detected_keywords.append('비디오게임 게임 플레이')
        if any(w in word for w in tech_words):
            detected_keywords.append('프로그래밍 기술 소프트웨어')
        if any(w in word for w in sport_words):
            detected_keywords.append('스포츠 운동 피트니스')
        if any(w in word for w in art_words):
            detected_keywords.append('문화 예술 음악 영화')

    if detected_keywords:
        result = f"r/{subreddit} {' '.join(detected_keywords)}"
        print(f"서브레딧 단어 분석: r/{subreddit} → {result[:80]}")
        return result

    # 최후 fallback: 서브레딧 이름만 (사회정치 오염 방지를 위해 중립 키워드 추가)
    words = ' '.join(sub_words)
    print(f"서브레딧 중립 fallback: r/{subreddit}")
    return f"lifestyle community {words} daily life"

def get_reddit_text(url):
    # 1차: JSON API 직접 접근
    try:
        json_url = url.rstrip('/') + '.json'
        json_url = json_url.split('?')[0] + '.json'
        res = requests.get(json_url, headers=REDDIT_HEADERS, timeout=8)
        if res.status_code == 200:
            data = res.json()
            post = data[0]['data']['children'][0]['data']
            title = post.get('title', '')
            selftext = post.get('selftext', '')[:400]
            subreddit = post.get('subreddit', '') or ''
            flair = post.get('link_flair_text', '') or ''

            # ✅ 댓글 상위 3개 포함
            comments_text = ''
            try:
                comments = data[1]['data']['children'][:3]
                for c in comments:
                    body = c.get('data', {}).get('body', '')
                    if body and len(body) > 10:
                        comments_text += ' ' + body[:150]
            except:
                pass

            # ✅ 서브레딧 정확 매핑 (카테고리명 + 키워드)
            sub_lower = subreddit.lower()
            if sub_lower in SUBREDDIT_CATEGORY_MAP:
                cat_name, cat_keywords = SUBREDDIT_CATEGORY_MAP[sub_lower]
                # 카테고리명을 3번 반복해서 벡터에 강하게 반영
                extra = f"{cat_keywords} {cat_name} {cat_name} {cat_name}"
            else:
                extra = SUBREDDIT_KEYWORD_MAP.get(sub_lower, '')
                fallback_text = get_reddit_fallback_text(url) or ''
                extra = f"{extra} {fallback_text}"

            full_text = f"{title} {title} {selftext} {flair} {comments_text} {extra}"
            print(f"Reddit JSON 분석 성공: r/{subreddit} ({SUBREDDIT_CATEGORY_MAP.get(sub_lower, ('미분류',''))[0]}) - {title[:50]}")
            return full_text.strip()
    except Exception as e:
        print(f"Reddit JSON 접근 실패: {e}")

    # 2차: 서브레딧 기반 fallback (EC2 차단 시)
    subreddit_from_url = extract_subreddit_from_url(url)
    if subreddit_from_url and subreddit_from_url in SUBREDDIT_CATEGORY_MAP:
        cat_name, cat_keywords = SUBREDDIT_CATEGORY_MAP[subreddit_from_url]
        fallback = f"r/{subreddit_from_url} {cat_keywords} {cat_name} {cat_name}"
        print(f"Reddit 카테고리 매핑 fallback: r/{subreddit_from_url} → {cat_name}")
        return fallback

    fallback = get_reddit_fallback_text(url)
    if fallback:
        print(f"Reddit 단어 분석 fallback: {fallback[:80]}")
        return fallback

    return None

def get_page_text(url):
    try:
        clean_url = url.split('?')[0] if '?' in url else url
        res = requests.get(clean_url, timeout=5, verify=False, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, "html.parser")
        for tag in soup(['script', 'style', 'nav', 'footer']):
            tag.decompose()
        return soup.get_text(separator=' ', strip=True)[:500]
    except:
        return "분석 실패"

def search_reddit_via_serpapi(keyword: str, limit: int = 2):
    if not SERPAPI_KEY:
        print("SerpAPI 키 없음")
        return []

    cache_key = keyword.lower()
    if cache_key in serpapi_cache:
        print(f"캐시 사용: {keyword}")
        return serpapi_cache[cache_key][:limit]

    try:
        query = f"site:reddit.com {keyword}"
        print(f"SerpAPI 검색: {query}")
        params = {
            "q": query,
            "api_key": SERPAPI_KEY,
            "num": limit * 3,
            "engine": "google",
        }
        res = requests.get("https://serpapi.com/search.json", params=params, timeout=15)

        if res.status_code == 200:
            data = res.json()
            organic = data.get("organic_results", [])
            posts = []
            for item in organic:
                url = item.get("link", "")
                title = item.get("title", "")
                snippet = item.get("snippet", "")
                if "reddit.com" not in url:
                    continue
                thumbnail = ""
                pagemap = item.get("pagemap", {})
                cse_image = pagemap.get("cse_image", [])
                if cse_image:
                    thumbnail = cse_image[0].get("src", "")
                subreddit_match = re.search(r'reddit\.com/r/([^/]+)', url)
                subreddit = subreddit_match.group(1) if subreddit_match else 'reddit'
                posts.append({
                    'title': title, 'url': url, 'thumbnail': thumbnail,
                    'snippet': snippet, 'subreddit': subreddit, 'type': 'reddit', 'score': 0,
                })
            print(f"SerpAPI 결과: {len(posts)}개")
            serpapi_cache[cache_key] = posts
            return posts[:limit]
    except Exception as e:
        print(f"SerpAPI 오류: {e}")
    return []

def search_naver(keyword, search_type='news', display=3):
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        return []
    try:
        headers = {'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET}
        params = {'query': keyword, 'display': display, 'sort': 'date'}
        res = requests.get(f'https://openapi.naver.com/v1/search/{search_type}.json', headers=headers, params=params, timeout=5)
        if res.status_code == 200:
            return [{'title': re.sub(r'<[^>]+>', '', i.get('title', '')), 'url': i.get('link', ''),
                     'thumbnail': 'https://ssl.pstatic.net/static/newsstand/2021/images/newsstand_logo_naver.png'}
                    for i in res.json().get('items', [])]
    except: pass
    return []

def calculate_bias_score(vectors):
    if not vectors: return 0
    # ✅ 벡터 1~2개여도 계산 (Reddit 최초 분석 시 편향 반영)
    if len(vectors) < 3:
        centroid = np.mean(vectors, axis=0)
        scores = np.array([cosine_similarity([centroid], [v])[0][0] for v in parent_category_embeddings.values()])
        top_score = float(np.max(scores))
        return min(85, max(0, round((top_score - 0.7) * 200)))
    centroid = np.mean(vectors, axis=0)
    scores = np.array([cosine_similarity([centroid], [v])[0][0] for v in parent_category_embeddings.values()])
    scores_normalized = (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)
    sorted_scores = np.sort(scores_normalized)
    n = len(sorted_scores)
    gini = (2 * np.sum((np.arange(1, n+1)) * sorted_scores) - (n+1) * np.sum(sorted_scores)) / (n * np.sum(sorted_scores) + 1e-9)
    return min(85, max(0, round(float(gini) * 85)))

# ✅ 분석된 게시물의 카테고리 직접 추적 (서브레딧 기반)
# user_data에 category_log 추가해서 분석할 때마다 카테고리 직접 기록

def classify_text_to_category(text: str) -> str:
    """
    텍스트를 12개 카테고리 중 하나로 직접 분류
    코사인 유사도로 가장 높은 카테고리 1개 반환
    """
    if not text:
        return None
    vec = model.encode([text])[0]
    sims = {cat: cosine_similarity([vec], [emb])[0][0]
            for cat, emb in category_embeddings.items()}
    return max(sims, key=sims.get)

def classify_text_to_multi_categories(text: str, threshold: float = 0.80) -> list:
    """
    ✅ 텍스트에서 관련 카테고리 여러 개 추출 (가중치 포함)
    최고 유사도의 threshold(80%) 이상인 카테고리 전부 반환
    반환: [{"category": "음식·요리", "weight": 0.45}, ...]
    """
    if not text:
        return []
    vec = model.encode([text])[0]
    sims = {cat: float(cosine_similarity([vec], [emb])[0][0])
            for cat, emb in category_embeddings.items()}

    max_sim = max(sims.values())
    cutoff = max_sim * threshold

    # 임계값 이상인 카테고리만 추출
    filtered = {cat: sim for cat, sim in sims.items() if sim >= cutoff}

    # 가중치 정규화 (합계 1.0)
    total = sum(filtered.values())
    result = [
        {"category": cat, "weight": round(sim / total, 3)}
        for cat, sim in sorted(filtered.items(), key=lambda x: x[1], reverse=True)
        if round(sim / total, 3) > 0
    ]
    return result

def get_category_scores_from_log(category_log: list, top_n=12):
    """
    ✅ 멀티 카테고리 로그에서 가중치 합산으로 비율 계산
    category_log = [{'category': '음식·요리', 'weight': 0.6, 'source': 'reddit'}, ...]
    """
    if not category_log:
        return []

    # ✅ 카테고리별 가중치 합산
    weights = {}
    for entry in category_log:
        cat = entry.get('category')
        weight = entry.get('weight', 1.0)  # weight 없으면 1.0으로 처리 (기존 데이터 호환)
        if cat:
            weights[cat] = weights.get(cat, 0) + weight

    total = sum(weights.values()) + 1e-9
    result = [
        {"name": cat, "percent": round(w / total * 100)}
        for cat, w in weights.items()
        if round(w / total * 100) > 0
    ]
    result.sort(key=lambda x: x["percent"], reverse=True)
    return result[:top_n]

def get_category_scores(vectors, top_n=12):
    """
    벡터 기반 카테고리 비율 (category_log 없을 때 fallback)
    """
    if not vectors: return []
    centroid = np.mean(vectors, axis=0)
    all_sims = {cat: cosine_similarity([centroid], [emb])[0][0]
                for cat, emb in category_embeddings.items()}
    max_sim = max(all_sims.values())
    threshold = max_sim * 0.75
    filtered = {cat: sim for cat, sim in all_sims.items() if sim >= threshold}
    total = sum(filtered.values()) + 1e-9
    result = [
        {"name": cat, "percent": round(sim / total * 100)}
        for cat, sim in filtered.items()
        if round(sim / total * 100) > 0
    ]
    result.sort(key=lambda x: x["percent"], reverse=True)
    return result[:top_n]

def get_category_scores_parent(vectors):
    """7개 부모 카테고리 기준 비율 (커뮤니티 비교용)"""
    if not vectors: return {}
    centroid = np.mean(vectors, axis=0)
    all_sims = {cat: cosine_similarity([centroid], [emb])[0][0]
                for cat, emb in parent_category_embeddings.items()}
    total = sum(all_sims.values()) + 1e-9
    return {cat: round(sim / total * 100) for cat, sim in all_sims.items()}

def compute_anti_keywords_detailed(vectors, used_keywords):
    if not vectors:
        return random.sample(KEYWORD_POOL, 5)
    centroid = np.mean(vectors, axis=0)
    cat_sims = {cat: cosine_similarity([centroid], [emb])[0][0] for cat, emb in category_embeddings.items()}
    top_cats = sorted(cat_sims, key=cat_sims.get, reverse=True)[:2]
    bottom_cats = sorted(cat_sims, key=cat_sims.get)[:4]
    excluded_parents = set(CATEGORY_DATA[cat]["parent"] for cat in top_cats)
    print(f"🚫 제외: {top_cats} (부모: {excluded_parents})")
    print(f"✅ 추천: {bottom_cats}")
    excluded_keywords = set()
    for cat, data in CATEGORY_DATA.items():
        if data["parent"] in excluded_parents:
            excluded_keywords.update(data["keywords"])
    candidate_keywords = []
    for cat in bottom_cats:
        if CATEGORY_DATA[cat]["parent"] not in excluded_parents:
            for kw in category_keywords.get(cat, []):
                if kw not in excluded_keywords and kw not in used_keywords:
                    candidate_keywords.append(kw)
    if len(candidate_keywords) < 5:
        candidate_keywords = [kw for kw in KEYWORD_POOL if kw not in excluded_keywords and kw not in used_keywords]
    if len(candidate_keywords) < 5:
        candidate_keywords = [kw for kw in KEYWORD_POOL if kw not in excluded_keywords]
    if not candidate_keywords:
        candidate_keywords = KEYWORD_POOL
    selected = random.sample(candidate_keywords, min(5, len(candidate_keywords)))
    print(f"📌 선택 키워드: {selected}")
    return selected

def get_anti_reddit_keywords(vectors):
    if not vectors:
        all_kws = [kw for kws in REDDIT_KEYWORD_POOL.values() for kw in kws]
        return random.sample(all_kws, min(3, len(all_kws)))
    centroid = np.mean(vectors, axis=0)
    cat_sims = {cat: cosine_similarity([centroid], [emb])[0][0] for cat, emb in category_embeddings.items()}
    top_cats = sorted(cat_sims, key=cat_sims.get, reverse=True)[:2]
    bottom_cats = sorted(cat_sims, key=cat_sims.get)[:3]
    excluded_parents = set(CATEGORY_DATA[cat]["parent"] for cat in top_cats)
    candidate_kws = []
    for cat in bottom_cats:
        if CATEGORY_DATA[cat]["parent"] not in excluded_parents:
            candidate_kws.extend(REDDIT_KEYWORD_POOL.get(cat, []))
    if not candidate_kws:
        candidate_kws = [kw for cat, kws in REDDIT_KEYWORD_POOL.items()
                        for kw in kws if CATEGORY_DATA[cat]["parent"] not in excluded_parents]
    if not candidate_kws:
        candidate_kws = [kw for kws in REDDIT_KEYWORD_POOL.values() for kw in kws]
    selected = random.sample(candidate_kws, min(3, len(candidate_kws)))
    print(f"✅ Reddit 검색 키워드: {selected}")
    return selected

# ✅ XAI: 편향 원인 설명 생성
def generate_xai_explanation(vectors, platform="youtube"):
    if not vectors or len(vectors) < 3:
        return {"summary": "아직 분석 데이터가 부족해요", "details": [], "suggestion": "콘텐츠를 더 분석해보세요!"}

    centroid = np.mean(vectors, axis=0)
    cat_sims = {cat: cosine_similarity([centroid], [emb])[0][0] for cat, emb in category_embeddings.items()}

    # 상위 2개 (편향된 카테고리)
    top2 = sorted(cat_sims, key=cat_sims.get, reverse=True)[:2]
    # 하위 2개 (부족한 카테고리)
    bottom2 = sorted(cat_sims, key=cat_sims.get)[:2]

    top_parents = list(set(CATEGORY_DATA[c]["parent"] for c in top2))
    bottom_parents = list(set(CATEGORY_DATA[c]["parent"] for c in bottom2))

    # 편향 강도 메시지
    bias_score = calculate_bias_score(vectors)
    if bias_score >= 71:
        intensity = "매우 강하게"
    elif bias_score >= 56:
        intensity = "상당히"
    elif bias_score >= 31:
        intensity = "약간"
    else:
        intensity = "거의"

    platform_name = "YouTube" if platform == "youtube" else "Reddit"
    top_names = ", ".join(top_parents)
    bottom_names = ", ".join(bottom_parents)

    summary = f"{platform_name} 알고리즘이 {intensity} '{top_names}' 콘텐츠를 편향 추천하고 있어요"

    details = [
        {
            "type": "bias",
            "emoji": "🔴",
            "title": f"'{top_names}' 과다 노출",
            "desc": f"전체 시청 콘텐츠의 상당 부분이 {top_names} 카테고리에 집중되어 있어요. 알고리즘이 비슷한 콘텐츠를 계속 추천하는 필터버블 상태예요."
        },
        {
            "type": "lack",
            "emoji": "⚪",
            "title": f"'{bottom_names}' 콘텐츠 부족",
            "desc": f"{bottom_names} 관련 콘텐츠를 거의 접하지 못하고 있어요. 알고리즘이 이 카테고리를 당신의 관심사에서 제외하고 있어요."
        },
        {
            "type": "mechanism",
            "emoji": "⚙️",
            "title": "알고리즘 작동 원리",
            "desc": f"플랫폼 알고리즘은 시청 기록을 분석해 비슷한 콘텐츠를 우선 추천해요. '{top_names}' 콘텐츠를 많이 볼수록 더 많은 관련 콘텐츠가 추천되는 악순환이 생겨요."
        },
    ]

    suggestion = f"'{bottom_names}' 카테고리 콘텐츠를 의도적으로 탐색하면 알고리즘 편향을 줄일 수 있어요. 파괴 탭의 추천 콘텐츠를 활용해보세요!"

    return {
        "summary": summary,
        "details": details,
        "suggestion": suggestion,
        "top_categories": top_parents,
        "bottom_categories": bottom_parents,
        "bias_score": bias_score,
    }

# ✅ 커뮤니티 편향 비교 계산
def get_community_comparison(user_vectors, platform="youtube"):
    """
    사용자 카테고리 분포 vs 균형잡힌 이상적 분포 비교
    반환: 카테고리별 사용자 비율, 커뮤니티 평균 비율, 차이
    """
    # 이상적 균형 분포: 7개 부모 카테고리 균등 (각 ~14.3%)
    ideal_dist = {cat: round(100 / len(parent_category_keywords)) for cat in parent_category_keywords}

    if not user_vectors:
        return {
            "user": {cat: 0 for cat in parent_category_keywords},
            "ideal": ideal_dist,
            "diff": {cat: -ideal_dist[cat] for cat in parent_category_keywords},
            "most_biased": None,
            "most_lacking": None,
        }

    user_dist = get_category_scores_parent(user_vectors)

    # 차이 계산 (양수 = 과다, 음수 = 부족)
    diff = {cat: user_dist.get(cat, 0) - ideal_dist.get(cat, 0) for cat in parent_category_keywords}

    most_biased = max(diff, key=diff.get)
    most_lacking = min(diff, key=diff.get)

    return {
        "user": user_dist,
        "ideal": ideal_dist,
        "diff": diff,
        "most_biased": most_biased,
        "most_lacking": most_lacking,
        "platform": platform,
    }


class PostRequest(BaseModel):
    url: str
    user_id: str = "user_default"

class CategoryRequest(BaseModel):
    categories: list
    user_id: str = "user_default"

class HashtagRequest(BaseModel):
    hashtags: List[str]
    user_id: str = "user_default"

@app.get("/")
def root():
    return {"status": "GhostFeed API running"}

@app.post("/analyze")
def analyze(body: PostRequest):
    if is_youtube(body.url):
        text = get_youtube_text(body.url) or get_page_text(body.url)
        source_type = "youtube"
    elif is_reddit(body.url):
        text = get_reddit_text(body.url) or get_page_text(body.url)
        source_type = "reddit"
    elif is_naver_news(body.url):
        text = get_page_text(body.url)
        source_type = "naver_news"
    elif is_naver_blog(body.url):
        text = get_page_text(body.url)
        source_type = "naver_blog"
    else:
        text = get_page_text(body.url)
        source_type = "web"

    # ✅ 텍스트 품질 필터
    if not text or not is_quality_text(text):
        print(f"[{body.user_id}] [{source_type}] 텍스트 품질 미달 - 분석 건너뜀")
        return {"status": "skip", "message": "콘텐츠 텍스트를 추출할 수 없었어요. 다른 URL을 시도해보세요.", "source_type": source_type}
    print(f"[{body.user_id}] [{source_type}] 분석: {text[:80]}")

    vector = model.encode([text])[0]
    data = load_data(body.user_id)
    data["vectors"].append(vector.tolist())
    data["vectors"] = data["vectors"][-100:]

    # ✅ 카테고리 직접 분류 후 로그 저장 (멀티 카테고리)
    if "category_log" not in data: data["category_log"] = []
    if "youtube_category_log" not in data: data["youtube_category_log"] = []
    if "reddit_category_log" not in data: data["reddit_category_log"] = []

    detected_category = None
    multi_categories = []

    if source_type == "reddit":
        subreddit_from_url = extract_subreddit_from_url(body.url)
        if subreddit_from_url and subreddit_from_url in SUBREDDIT_CATEGORY_MAP:
            # ✅ 서브레딧 매핑 카테고리 1순위 + 텍스트 멀티 분류 합산
            primary_cat = SUBREDDIT_CATEGORY_MAP[subreddit_from_url][0]
            detected_category = primary_cat
            text_cats = classify_text_to_multi_categories(text, threshold=0.85)
            # 서브레딧 매핑 카테고리 가중치 0.6, 텍스트 분류 0.4 비율로 합산
            cat_weights = {}
            cat_weights[primary_cat] = cat_weights.get(primary_cat, 0) + 0.6
            for tc in text_cats:
                cat_weights[tc["category"]] = cat_weights.get(tc["category"], 0) + tc["weight"] * 0.4
            total_w = sum(cat_weights.values())
            multi_categories = [
                {"category": cat, "weight": round(w / total_w, 3)}
                for cat, w in sorted(cat_weights.items(), key=lambda x: x[1], reverse=True)
                if round(w / total_w, 3) >= 0.05  # 5% 미만 제외
            ]
            print(f"✅ 서브레딧+텍스트 멀티 분류: r/{subreddit_from_url} → {[c['category'] for c in multi_categories]}")

    if not multi_categories:
        multi_categories = classify_text_to_multi_categories(text, threshold=0.82)
        if multi_categories:
            detected_category = multi_categories[0]["category"]
        else:
            detected_category = classify_text_to_category(text)
            multi_categories = [{"category": detected_category, "weight": 1.0}]
        print(f"✅ 텍스트 멀티 분류: {[c['category'] for c in multi_categories]}")

    # ✅ 멀티 카테고리 로그 저장
    for cat_entry in multi_categories:
        log_entry = {
            "category": cat_entry["category"],
            "weight": cat_entry["weight"],
            "source": source_type,
            "url": body.url,
        }
        data["category_log"].append(log_entry)
        if source_type == "youtube":
            data["youtube_category_log"].append(log_entry)
        elif source_type == "reddit":
            data["reddit_category_log"].append(log_entry)

    data["category_log"] = data["category_log"][-500:]
    data["youtube_category_log"] = data["youtube_category_log"][-500:]
    data["reddit_category_log"] = data["reddit_category_log"][-500:]

    if source_type == "youtube":
        if "youtube_vectors" not in data: data["youtube_vectors"] = []
        if "youtube_history" not in data: data["youtube_history"] = []
        data["youtube_vectors"].append(vector.tolist())
        data["youtube_vectors"] = data["youtube_vectors"][-100:]
        score = calculate_bias_score(data["youtube_vectors"])
        data["youtube_history"].append(score)
        data["youtube_history"] = data["youtube_history"][-50:]
    elif source_type == "reddit":
        if "reddit_vectors" not in data: data["reddit_vectors"] = []
        if "reddit_history" not in data: data["reddit_history"] = []
        data["reddit_vectors"].append(vector.tolist())
        data["reddit_vectors"] = data["reddit_vectors"][-100:]
        score = calculate_bias_score(data["reddit_vectors"])
        data["reddit_history"].append(score)
        data["reddit_history"] = data["reddit_history"][-50:]

    if "analyzed_texts" not in data: data["analyzed_texts"] = []
    data["analyzed_texts"].append({"url": body.url, "text": text[:100], "source_type": source_type})
    data["analyzed_texts"] = data["analyzed_texts"][-50:]
    data["last_source_type"] = source_type

    score = calculate_bias_score(data["vectors"])
    if "history" not in data: data["history"] = []
    data["history"].append(score)
    data["history"] = data["history"][-50:]

    used_keywords = data.get("used_keywords", [])
    new_keywords = compute_anti_keywords_detailed(data["vectors"], used_keywords)
    data["last_anti_keywords"] = new_keywords
    used_keywords.extend(new_keywords)
    data["used_keywords"] = used_keywords[-20:]
    save_data(data, body.user_id)

    # ✅ 분석 결과 카드용 - category_log 기반 우선
    if source_type == "youtube":
        cat_log = data.get("youtube_category_log", [])
        cat_vectors = data.get("youtube_vectors", [])
    elif source_type == "reddit":
        cat_log = data.get("reddit_category_log", [])
        cat_vectors = data.get("reddit_vectors", [])
    else:
        cat_log = data.get("category_log", [])
        cat_vectors = data.get("vectors", [])

    if cat_log:
        categories = get_category_scores_from_log(cat_log, top_n=5)
    else:
        categories = get_category_scores(cat_vectors, top_n=5)

    # ✅ 방금 분석한 카테고리도 포함
    just_analyzed = {"name": detected_category, "just_analyzed": True} if detected_category else None

    return {
        "status": "ok",
        "text": text[:100],
        "message": "분석 완료!",
        "anti_keywords": new_keywords,
        "source_type": source_type,
        "categories": categories,
        "just_analyzed_category": just_analyzed,
        "biasScore": calculate_bias_score(cat_vectors),
    }

@app.post("/analyze-hashtags")
def analyze_hashtags(body: HashtagRequest):
    hashtag_text = ' '.join(body.hashtags)
    vector = model.encode([hashtag_text])[0]
    data = load_data(body.user_id)
    for _ in range(3):
        data["vectors"].append(vector.tolist())
        if "reddit_vectors" not in data: data["reddit_vectors"] = []
        data["reddit_vectors"].append(vector.tolist())
    data["vectors"] = data["vectors"][-100:]
    data["reddit_vectors"] = data["reddit_vectors"][-100:]
    if "analyzed_texts" not in data: data["analyzed_texts"] = []
    data["analyzed_texts"].append({"url": f"hashtags: {hashtag_text}", "text": hashtag_text, "source_type": "hashtag"})
    data["last_source_type"] = "reddit"
    score = calculate_bias_score(data["vectors"])
    if "history" not in data: data["history"] = []
    data["history"].append(score)
    data["history"] = data["history"][-50:]
    if "reddit_history" not in data: data["reddit_history"] = []
    data["reddit_history"].append(calculate_bias_score(data["reddit_vectors"]))
    data["reddit_history"] = data["reddit_history"][-50:]
    used_keywords = data.get("used_keywords", [])
    new_keywords = compute_anti_keywords_detailed(data["vectors"], used_keywords)
    data["last_anti_keywords"] = new_keywords
    used_keywords.extend(new_keywords)
    data["used_keywords"] = used_keywords[-20:]
    save_data(data, body.user_id)
    return {"status": "ok", "message": f"해시태그 {len(body.hashtags)}개 분석 완료!", "source_type": "reddit"}

@app.post("/select-categories")
def select_categories(body: CategoryRequest):
    vectors = []
    for cat in body.categories:
        for detail_cat, data_cat in CATEGORY_DATA.items():
            if data_cat["parent"] == cat:
                vectors.extend([category_embeddings[detail_cat].tolist()] * 3)
    if not vectors:
        return {"status": "error", "message": "유효한 카테고리 없음"}
    data = load_data(body.user_id)
    data["vectors"].extend(vectors)
    data["vectors"] = data["vectors"][-100:]
    if "youtube_vectors" not in data: data["youtube_vectors"] = []
    if "youtube_history" not in data: data["youtube_history"] = []
    if "category_log" not in data: data["category_log"] = []
    if "youtube_category_log" not in data: data["youtube_category_log"] = []
    data["youtube_vectors"].extend(vectors)
    data["youtube_vectors"] = data["youtube_vectors"][-100:]

    # ✅ 선택한 카테고리를 category_log에 직접 기록
    for cat_parent in body.categories:
        # 부모 카테고리 → 세부 카테고리 매핑
        for detail_cat, cat_data in CATEGORY_DATA.items():
            if cat_data["parent"] == cat_parent:
                log_entry = {"category": detail_cat, "source": "youtube", "url": f"category:{cat_parent}"}
                data["category_log"].append(log_entry)
                data["youtube_category_log"].append(log_entry)
    data["category_log"] = data["category_log"][-200:]
    data["youtube_category_log"] = data["youtube_category_log"][-200:]

    score = calculate_bias_score(data["vectors"])
    if "history" not in data: data["history"] = []
    data["history"].append(score)
    data["youtube_history"].append(calculate_bias_score(data["youtube_vectors"]))
    data["youtube_history"] = data["youtube_history"][-50:]
    used_keywords = data.get("used_keywords", [])
    new_keywords = compute_anti_keywords_detailed(data["vectors"], used_keywords)
    data["last_anti_keywords"] = new_keywords
    used_keywords.extend(new_keywords)
    data["used_keywords"] = used_keywords[-20:]
    data["last_source_type"] = "youtube"
    save_data(data, body.user_id)
    return {"status": "ok", "message": "카테고리 선택 완료!", "anti_keywords": new_keywords}

@app.get("/anti-keywords/{user_id}")
def get_anti_keywords(user_id: str, exclude: str = ""):
    data = load_data(user_id)
    vectors = data["vectors"]
    used_keywords = data.get("used_keywords", [])
    exclude_ids = set(exclude.split(",")) if exclude else set()
    source_type = data.get("last_source_type", "youtube")

    selected = compute_anti_keywords_detailed(vectors, used_keywords)
    used_keywords.extend(selected)
    data["used_keywords"] = used_keywords[-20:]
    data["last_anti_keywords"] = selected
    save_data(data, user_id)

    results = []
    all_keywords = selected + [kw for kw in KEYWORD_POOL if kw not in selected]

    if source_type == "reddit":
        print("🤖 Reddit 추천 모드 (SerpAPI 경유)")
        anti_reddit_kws = get_anti_reddit_keywords(vectors)
        for kw in anti_reddit_kws:
            if len(results) >= 5: break
            time.sleep(0.3)
            posts = search_reddit_via_serpapi(kw, limit=2)
            for post in posts:
                if len(results) >= 5: break
                vid = f"reddit_{hash(post['url']) % 100000}"
                if vid not in exclude_ids:
                    results.append({
                        "keyword": post['subreddit'],
                        "videoId": vid,
                        "title": post['title'],
                        "thumbnail": post['thumbnail'],
                        "url": post['url'],
                        "type": "reddit",
                        "score": 0,
                        "subreddit": post['subreddit'],
                        "snippet": post.get('snippet', ''),
                    })
        if len(results) == 0:
            print("SerpAPI 실패 → 빈 결과 반환")
            return {"keywords": [], "source_type": "reddit", "error": "reddit_unavailable"}

    elif source_type in ["naver_news", "naver_blog"]:
        search_type = 'news' if source_type == "naver_news" else 'blog'
        for keyword in all_keywords:
            if len(results) >= 5: break
            for item in search_naver(keyword, search_type=search_type, display=3):
                if len(results) >= 5: break
                if item['url'] not in exclude_ids:
                    results.append({"keyword": keyword, "videoId": item['url'], "title": item['title'],
                                    "thumbnail": item['thumbnail'], "url": item['url'], "type": source_type})

    else:
        print("▶ 유튜브 반대 장르 추천")
        if not YOUTUBE_API_KEY:
            return {"error": "API Key missing"}
        youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
        for keyword in all_keywords:
            if len(results) >= 5: break
            try:
                res = youtube.search().list(
                    q=keyword, part='snippet', maxResults=10,
                    type='video', relevanceLanguage='ko', order='relevance'
                ).execute()
                if res['items']:
                    available = [i for i in res['items']
                                 if i['id']['videoId'] not in exclude_ids
                                 and i['id']['videoId'] not in [r['videoId'] for r in results]]
                    if not available: available = res['items']
                    item = random.choice(available)
                    results.append({
                        "keyword": keyword,
                        "videoId": item['id']['videoId'],
                        "title": item['snippet']['title'],
                        "thumbnail": item['snippet']['thumbnails']['medium']['url'],
                        "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                        "type": "youtube"
                    })
            except Exception as e:
                print(f"YouTube 오류 ({keyword}): {e}")

    return {"keywords": results, "source_type": source_type}

@app.get("/report/{user_id}")
def get_report(user_id: str, platform: str = "all"):
    data = load_data(user_id)
    if platform == "youtube":
        vectors = data.get("youtube_vectors", [])
        history = data.get("youtube_history", [])
    elif platform == "reddit":
        vectors = data.get("reddit_vectors", [])
        history = data.get("reddit_history", [])
    else:
        vectors = data.get("vectors", [])
        history = data.get("history", [])

    if not vectors:
        return {
            "biasScore": 0, "diversity": 100, "history": [],
            "categories": [], "totalAnalyzed": 0, "platform": platform,
            "xai": None, "community": None,
        }

    bias_score = calculate_bias_score(vectors)

    # ✅ category_log 있으면 직접 분류 결과 사용, 없으면 벡터 기반 fallback
    if platform == "youtube":
        cat_log = data.get("youtube_category_log", [])
    elif platform == "reddit":
        cat_log = data.get("reddit_category_log", [])
    else:
        cat_log = data.get("category_log", [])

    if cat_log:
        category_scores = get_category_scores_from_log(cat_log, top_n=12)
        print(f"카테고리 로그 기반 계산: {len(cat_log)}개 게시물")
    else:
        category_scores = get_category_scores(vectors, top_n=12)
        print(f"벡터 기반 카테고리 계산 (로그 없음)")
    # ✅ XAI 설명
    xai = generate_xai_explanation(vectors, platform=platform)
    # ✅ 커뮤니티 편향 비교
    community = get_community_comparison(vectors, platform=platform)

    return {
        "biasScore": bias_score,
        "diversity": 100 - bias_score,
        "history": history[-10:],
        "categories": category_scores,
        "totalAnalyzed": len(vectors),
        "platform": platform,
        "xai": xai,           # ✅ XAI 설명 추가
        "community": community, # ✅ 커뮤니티 비교 추가
    }

# ✅ 커뮤니티 편향 비교 전용 엔드포인트
@app.get("/community/{user_id}")
def get_community(user_id: str, platform: str = "youtube"):
    data = load_data(user_id)
    if platform == "youtube":
        vectors = data.get("youtube_vectors", [])
    elif platform == "reddit":
        vectors = data.get("reddit_vectors", [])
    else:
        vectors = data.get("vectors", [])
    return get_community_comparison(vectors, platform=platform)

# ✅ XAI 전용 엔드포인트
@app.get("/xai/{user_id}")
def get_xai(user_id: str, platform: str = "youtube"):
    data = load_data(user_id)
    if platform == "youtube":
        vectors = data.get("youtube_vectors", [])
    elif platform == "reddit":
        vectors = data.get("reddit_vectors", [])
    else:
        vectors = data.get("vectors", [])
    return generate_xai_explanation(vectors, platform=platform)

@app.delete("/reset/{user_id}")
def reset_data(user_id: str):
    file = get_user_file(user_id)
    if os.path.exists(file):
        os.remove(file)
    return {"message": "데이터 초기화 완료"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# =============================================
# ✅ 1번: 실시간 알고리즘 변화 추적 + 5번: 이슈 편향 경고
# =============================================

def detect_algorithm_change(history: list, threshold: int = 15) -> dict:
    """
    편향 점수 히스토리에서 급격한 변화를 감지
    threshold: 이 점수 이상 급증하면 알고리즘 변화로 판단
    """
    if not history or len(history) < 2:
        return {"detected": False, "message": None}

    changes = []
    for i in range(1, len(history)):
        diff = history[i] - history[i-1]
        changes.append(diff)

    # 최근 변화
    recent_change = changes[-1] if changes else 0
    # 평균 변화율
    avg_change = sum(abs(c) for c in changes) / len(changes) if changes else 0
    # 최대 급증
    max_spike = max(changes) if changes else 0

    detected = recent_change >= threshold or max_spike >= threshold * 1.5

    # 트렌드 방향
    if len(history) >= 3:
        recent_avg = sum(history[-3:]) / 3
        older_avg = sum(history[:-3]) / max(len(history) - 3, 1) if len(history) > 3 else history[0]
        trend = "상승" if recent_avg > older_avg + 5 else "하락" if recent_avg < older_avg - 5 else "안정"
    else:
        trend = "안정"

    message = None
    alert_level = "normal"

    if recent_change >= threshold:
        message = f"⚠️ 최근 편향 점수가 {recent_change}점 급증했어요! 알고리즘이 특정 콘텐츠를 집중 추천하고 있을 수 있어요."
        alert_level = "warning"
    elif max_spike >= threshold * 1.5:
        message = f"🚨 과거 편향 점수가 {max_spike}점 급증한 적이 있어요. 알고리즘 변화가 감지됐어요."
        alert_level = "caution"
    elif trend == "상승":
        message = "📈 편향 점수가 점점 높아지는 추세예요. 다양한 콘텐츠를 탐색해보세요."
        alert_level = "info"

    return {
        "detected": detected,
        "message": message,
        "alert_level": alert_level,
        "trend": trend,
        "recent_change": recent_change,
        "max_spike": max_spike,
        "avg_change": round(avg_change, 1),
    }

def detect_category_spike(vectors_timeline: list, window: int = 5) -> dict:
    """
    최근 분석된 콘텐츠에서 특정 카테고리 급증 감지
    vectors_timeline: 시간순 벡터 리스트
    """
    if not vectors_timeline or len(vectors_timeline) < window:
        return {"detected": False, "spiked_category": None}

    # 최근 window개 vs 이전 전체
    recent_vectors = vectors_timeline[-window:]
    older_vectors = vectors_timeline[:-window] if len(vectors_timeline) > window else []

    if not older_vectors:
        return {"detected": False, "spiked_category": None}

    recent_dist = get_category_scores_parent(recent_vectors)
    older_dist = get_category_scores_parent(older_vectors)

    # 카테고리별 급증 감지
    spikes = {}
    for cat in recent_dist:
        diff = recent_dist.get(cat, 0) - older_dist.get(cat, 0)
        if diff >= 20:  # 20%p 이상 급증
            spikes[cat] = diff

    if spikes:
        top_spike_cat = max(spikes, key=spikes.get)
        return {
            "detected": True,
            "spiked_category": top_spike_cat,
            "spike_amount": spikes[top_spike_cat],
            "message": f"🚨 최근 '{top_spike_cat}' 콘텐츠 소비가 {spikes[top_spike_cat]}%p 급증했어요! 필터버블 위험 신호예요.",
            "all_spikes": spikes,
        }

    return {"detected": False, "spiked_category": None}

@app.get("/trend/{user_id}")
def get_trend(user_id: str, platform: str = "youtube"):
    """
    ✅ 1번 실시간 알고리즘 변화 추적
    ✅ 5번 실시간 이슈 기반 편향 경고
    """
    data = load_data(user_id)

    if platform == "youtube":
        vectors = data.get("youtube_vectors", [])
        history = data.get("youtube_history", [])
    elif platform == "reddit":
        vectors = data.get("reddit_vectors", [])
        history = data.get("reddit_history", [])
    else:
        vectors = data.get("vectors", [])
        history = data.get("history", [])

    if not history or len(history) < 2:
        return {
            "platform": platform,
            "history": history,
            "algorithm_change": {"detected": False, "message": "아직 분석 데이터가 부족해요", "alert_level": "normal"},
            "category_spike": {"detected": False, "spiked_category": None},
            "current_bias": calculate_bias_score(vectors) if vectors else 0,
            "trend_summary": "데이터 부족",
        }

    # 알고리즘 변화 감지
    algo_change = detect_algorithm_change(history)
    # 카테고리 급증 감지
    cat_spike = detect_category_spike(vectors)

    # 현재 편향 점수
    current_bias = calculate_bias_score(vectors) if vectors else 0

    # 트렌드 요약 텍스트
    if algo_change["trend"] == "상승":
        trend_summary = f"📈 편향이 점점 심해지고 있어요 (현재 {current_bias}점)"
    elif algo_change["trend"] == "하락":
        trend_summary = f"📉 편향이 줄어들고 있어요! (현재 {current_bias}점)"
    else:
        trend_summary = f"➡️ 편향이 안정적이에요 (현재 {current_bias}점)"

    # 최근 10개 히스토리
    recent_history = history[-10:]
    # 히스토리 변화율 계산
    history_with_change = []
    for i, score in enumerate(recent_history):
        change = score - recent_history[i-1] if i > 0 else 0
        history_with_change.append({
            "score": score,
            "change": change,
            "index": i + 1,
        })

    return {
        "platform": platform,
        "history": history_with_change,
        "algorithm_change": algo_change,
        "category_spike": cat_spike,
        "current_bias": current_bias,
        "trend_summary": trend_summary,
        "total_analyzed": len(vectors),
    }
