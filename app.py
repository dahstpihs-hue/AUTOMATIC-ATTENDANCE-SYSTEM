import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime
import time

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- 2. ELITE CSS FOR BLINKING & STYLING ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black', sans-serif;
        font-size: 35px;
        color: #FFD700;
        animation: blinker 1.5s linear infinite;
        text-align: center;
        text-shadow: 0 0 25px #FFA500;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 40px; border-radius: 20px; 
        border: 2px solid #FFD700; box-shadow: 0px 10px 40px rgba(0,0,0,0.9);
        text-align: center; margin-bottom: 30px;
    }
    .stButton>button { 
        width: 100%; background-color: #28a745; 
        color: white; font-weight: bold; border-radius: 10px; height: 3.5em;
    }
    </style>
    """, unsafe_allow_html=True)

# --- 3. BACKEND CORE FUNCTIONS ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = get_service()
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        # Header normalization (removes spaces, fixes case)
        df = pd.DataFrame(values[1:], columns=values[0])
        df.columns = df.columns.str.strip().str.title()
        return df
    except Exception as e:
        return pd.DataFrame()

def update_password_sync(username, new_password):
    try:
        service = get_service()
        df = get_data("USERS_CREDENTIALS!A:F")
        row_idx = df[df['Username'] == username].index[0] + 2
        # Update Password (Column E) and set Is_First_Login to FALSE (Column F)
        range_to_update = f"USERS_CREDENTIALS!E{row_idx}:F{row_idx}"
        body = {'values': [[new_password, "FALSE"]]}
        service.spreadsheets().values().update(
            spreadsheetId=SHEET_ID, range=range_to_update,
            valueInputOption="RAW", body=body).execute()
        return True
    except: return False

# --- 4. THE WELCOME GATEWAY ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.balloons()

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px; letter-spacing: 2px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- 5. AUTHENTICATION & SECURITY LOGIC ---
if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    
    if not users_df.empty:
        cols = st.columns([1, 1.5, 1])
        with cols[1]:
            role_sel = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty', 'Student'])
            
            if role_sel != '-- SELECT ROLE --':
                if role_sel == 'Faculty':
                    name_list = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
                    user_identity = st.selectbox("Select Your Name:", name_list)
                else:
                    user_identity = role_sel

                pwd_input = st.text_input("Password", type="password")
                
                if st.button("Access Dashboard"):
                    if role_sel == 'Faculty':
                        match = users_df[(users_df['Full Name'] == user_identity) & (users_df['Password'] == pwd_input)]
                    elif role_sel == 'Student':
                        st.session_state.logged_in = True
                        st.session_state.user = {'Full Name': 'Student View', 'Role': 'Student'}
                        st.rerun()
                    else:
                        match = users_df[(users_df['Role'] == role_sel) & (users_df['Password'] == pwd_input)]
                    
                    if 'match' in locals() and not match.empty:
                        temp_user = match.iloc[0].to_dict()
                        if str(temp_user.get('Is_First_Login', '')).upper() == 'TRUE':
                            st.session_state.needs_reset = True
                            st.session_state.temp_user = temp_user
                            st.rerun()
                        else:
                            st.session_state.logged_in = True
                            st.session_state.user = temp_user
                            st.rerun()
                    elif role_sel != 'Student':
                        st.error("❌ Incorrect Credentials")

        # Password Reset Trigger
        if st.session_state.get('needs_reset'):
            st.markdown("---")
            st.warning("🔒 First Time Login: Security ke liye password tabdeel karein!")
            new_p = st.text_input("Enter New Password", type="password")
            if st.button("Save & Login"):
                if len(new_p) >= 5:
                    if update_password_sync(st.session_state.temp_user['Username'], new_p):
                        st.success("✅ Password Updated in Sheet! Please login again.")
                        time.sleep(2)
                        st.session_state.needs_reset = False
                        st.rerun()
                else: st.error("Password kam az kam 5 huroof ka ho.")
    else:
