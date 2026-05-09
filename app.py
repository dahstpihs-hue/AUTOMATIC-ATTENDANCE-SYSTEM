import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- 1. CONFIGURATION & ELITE THEME ---
st.set_page_config(page_title="PIHS Mardan Command Center", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black'; font-size: 32px; color: #FFD700;
        animation: blinker 1.5s linear infinite; text-align: center;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 25px; border-radius: 20px; 
        border: 2px solid #FFD700; text-align: center; margin-bottom: 20px;
        box-shadow: 0px 10px 30px rgba(0,0,0,0.8);
    }
    .critical-alert {
        color: #ff4b4b; font-weight: bold; animation: blinker 1s linear infinite;
        background-color: rgba(255, 75, 75, 0.1); padding: 15px; border-radius: 10px; border: 1px solid red;
    }
    .stButton>button { width: 100%; border-radius: 12px; height: 3.5em; font-weight: bold; background-color: #28a745; color: white; }
    .sidebar-cal { background-color: #1b263b; padding: 15px; border-radius: 10px; border-top: 4px solid #1a73e8; text-align: center; }
    </style>
    """, unsafe_allow_html=True)

# --- 2. BACKEND ENGINES ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = get_service()
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        # Auto-Clean Headers
        headers = [str(h).strip().title() for h in values[0]]
        return pd.DataFrame(values[1:], columns=headers)
    except: return pd.DataFrame()

def sync_sheet(range_name, values, mode="append"):
    service = get_service()
    if mode == "append":
        service.spreadsheets().values().append(spreadsheetId=SHEET_ID, range=range_name, valueInputOption="RAW", body={'values': values}).execute()
    else:
        service.spreadsheets().values().update(spreadsheetId=SHEET_ID, range=range_name, valueInputOption="RAW", body={'values': values}).execute()

# --- 3. WELCOME GATEWAY ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.balloons()

st.markdown('<div class="gateway-master"><div class="blinking-text">WELCOME TO THE</div><h1 style="color:white; font-size:26px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1><p style="color:#FFD700;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p></div>', unsafe_allow_html=True)

# --- 4. AUTHENTICATION ---
if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        role = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty', 'Student'])
        
        if role in ['HOD', 'COORDINATOR', 'Faculty']:
            # Faculty selects name, HOD/Coord direct login
            if role == 'Faculty' and not users_df.empty:
                f_names = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
                user_sel = st.selectbox("Select Your Name:", f_names)
            else: user_sel = role
            
            pwd = st.text_input("PASSWORD", type="password")
            if st.button("ENTER COMMAND CENTER"):
                match = users_df[(users_df['Full Name'] == user_sel) & (users_df['Password'] == pwd)] if role == 'Faculty' else users_df[(users_df['Role'] == role) & (users_df['Password'] == pwd)]
                if not match.empty:
                    st.session_state.logged_in, st.session_state.user = True, match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Incorrect Credentials")
        
        elif role == 'Student':
            if st.button("OPEN STUDENT PORTAL (NO PASSWORD)"):
                st.session_state.logged_in, st.session_state.user = True, {'Role': 'Student', 'Full Name': 'Guest Student'}
                st.rerun()

# --- 5. LOGGED-IN INTERFACE ---
else:
    u = st.session_state.user
    role = u['Role']
    
    with st.sidebar:
        now = datetime.now()
        st.markdown(f'<div class="sidebar-cal"><h4 style="color:#FFD700; margin:0;">📅 SYSTEM DATE</h4><h2 style="color:white; margin:0;">{now.strftime("%d %b")}</h2><p style="color:#1a73e8; margin:0;">{now.strftime("%A")}</p></div>', unsafe_allow_html=True)
        if st.button("Logout"):
            st.session_state.logged_in = False
            st.rerun()

    # --- HOD & COORDINATOR MASTER VIEW ---
    if role in ['HOD', 'COORDINATOR']:
        st.title(f"🛡️ {role} Command Dashboard")
        tabs = st.tabs(["📊 Analytics & Warning", "📝 Mark Attendance", "⚙️ Faculty Stall"])
        
        with tabs[0]: # 75% Warning & Summary
