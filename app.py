import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- 1. PAGE CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- 2. ELITE CSS FOR CLEAN INTERFACE ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black', sans-serif;
        font-size: 32px;
        color: #FFD700;
        animation: blinker 1.5s linear infinite;
        text-align: center;
        text-shadow: 0 0 20px #FFA500;
    }
    
    .gateway-master { 
        background-color: #001d3d; 
        padding: 40px; 
        border-radius: 20px; 
        border: 2px solid #FFD700; 
        box-shadow: 0px 10px 40px rgba(0,0,0,0.9);
        text-align: center;
        margin-bottom: 30px;
    }
    
    .login-box {
        background-color: #1b263b;
        padding: 30px;
        border-radius: 15px;
        border: 1px solid #415a77;
    }
    
    .stButton>button { 
        width: 100%; 
        background-color: #28a745; 
        color: white; font-weight: bold; border-radius: 8px; height: 3em;
    }
    </style>
    """, unsafe_allow_html=True)

# --- 3. BACKEND FUNCTIONS ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = get_service()
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        df = pd.DataFrame(values[1:], columns=values[0])
        df.columns = df.columns.str.strip()
        return df
    except: return pd.DataFrame()

# --- 4. THE WELCOME GATEWAY ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

# Sirf ye portion nazar aayega login se pehle
st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px; letter-spacing: 2px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- 5. LOGIN SECTION ---
if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.markdown("<div class='login-box'>", unsafe_allow_html=True)
        role = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty', 'Student'])
        
        if role != '-- SELECT ROLE --':
            if role == 'Faculty':
                names = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
                user_sel = st.selectbox("Select Your Name:", names)
            
            pwd = st.text_input("Enter Password", type="password")
            
            if st.button("Access Dashboard"):
                # Authentication Logic
                if role == 'HOD' or role == 'COORDINATOR':
                    match = users_df[(users_df['Role'] == role) & (users_df['Password'] == pwd)]
                else:
                    match = users_df[(users_df['Full Name'] == user_sel) & (users_df['Password'] == pwd)]
                
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user = match.iloc[0].to_dict()
                    st.balloons()
                    st.rerun()
                else:
                    st.error("Invalid Credentials")
        st.markdown("</div>", unsafe_allow_html=True)

# --- 6. LOGGED IN CONTENT ---
else:
    u = st.session_state.user
    st.sidebar.success(f"User: {u['Full Name']}")
    st.title(f"🛡️ {u['Role']} Dashboard")
    
    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
