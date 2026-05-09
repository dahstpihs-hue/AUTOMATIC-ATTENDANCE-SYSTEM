import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime
import base64
import time

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- ELITE CSS & BLINKING ANIMATION ---
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
        margin-bottom: 0px;
    }
    
    .gateway-master { 
        background-color: #001d3d; 
        padding: 25px; 
        border-radius: 20px; 
        border: 2px solid #FFD700; 
        box-shadow: 0px 10px 40px rgba(0,0,0,0.9);
        text-align: center;
        margin-bottom: 20px;
    }

    .stButton>button { 
        width: 100%; 
        background-image: linear-gradient(to right, #28a745, #218838); 
        color: white; font-weight: bold; border-radius: 10px; height: 3.5em; border: none;
    }
    
    /* Login Box Styling */
    .login-container {
        background-color: #1b263b;
        padding: 30px;
        border-radius: 15px;
        border: 1px solid #415a77;
    }
    </style>
    """, unsafe_allow_html=True)

# --- BACKEND ENGINES ---
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

# --- HEADER & CELEBRATION ---
if 'first_load' not in st.session_state:
    st.balloons()
    st.session_state.first_load = False

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:24px; letter-spacing: 2px; margin-top:0px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:16px; font-weight:bold;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- AUTHENTICATION ENGINE ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    # Fetching latest credentials from USERS_CREDENTIALS
    users_df = get_data("USERS_CREDENTIALS!A:F")
    
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.markdown("<div class='login-container'>", unsafe_allow_html=True)
        st.markdown("<h3 style='text-align:center; color:white;'>🔒 SYSTEM AUTHENTICATION</h3>", unsafe_allow_html=True)
        
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER', 'STUDENT'])
        
        if role_selection in ['HOD', 'COORDINATOR']:
            # Direct Password for HOD/Coordinator
            pass_input = st.text_input("SYSTEM PASSWORD", type="password")
            if st.button("AUTHORIZE & ENTER"):
                match = users_df[(users_df['Role'] == role_selection) & (users_df['Password'] == pass_input)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Invalid Password!")

        elif role_selection == 'FACULTY MEMBER':
            # Select Name first as instructed
            faculty_list = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
            selected_faculty = st.selectbox("SELECT YOUR NAME:", faculty_list)
            pass_input = st.text_input("PERSONAL PASSWORD", type="password")
            if st.button("VERIFY & ENTER"):
                match = users_df[(users_df['Full Name'] == selected_faculty) & (users_df['Password'] == pass_input)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Incorrect Credentials")

        elif role_selection == 'STUDENT':
            if st.button("PROCEED TO STUDENT PORTAL"):
                st.session_state.logged_in = True
                st.session_state.user_data = {'Role': 'Student', 'Full Name': 'Student Access'}
                st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

else:
    user = st.session_state.user_data
    role = user['Role']
    
    # --- SHARED SIDEBAR ---
    st.sidebar.markdown(f"### 📍 Welcome\n**{user['Full Name']}**")
    st.sidebar.info(f"Department: {user.get('Department', 'N/A')}")
    
    # --- DASHBOARD LOGIC (HOD, Coordinator & Faculty are all Subject Teachers) ---
    st.title(f"🛡️ {role} Dashboard")
    
    if role in ['HOD', 'COORDINATOR', 'Faculty']:
        st.markdown("### 📋 Faculty Regulatory Portal")
        
        # Multi-tab system for HOD/Coordinator
        if role in ['HOD', 'COORDINATOR']:
            tabs = st.tabs(["Mark Attendance", "Institutional Analytics", "Staff Monitoring"])
            active_tab = tabs[0]
        else:
            active_tab = st.container()

        with active_tab:
            st.write("Attendance, Batches, and Semester logic from Database...")
            # Yahan aapka attendance marking logic load hoga
            
    if st.sidebar.button("🚪 Secure Logout"):
        st.session_state.logged_in = False
        st.rerun()
