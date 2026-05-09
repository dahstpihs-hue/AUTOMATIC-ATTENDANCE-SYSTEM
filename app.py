import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- ELITE CSS ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black'; font-size: 35px; color: #FFD700;
        animation: blinker 1.5s linear infinite; text-align: center;
        text-shadow: 0 0 25px #FFA500;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 30px; border-radius: 20px; 
        border: 2px solid #FFD700; text-align: center; margin-bottom: 30px;
    }
    .stButton>button { width: 100%; border-radius: 10px; height: 3.5em; font-weight: bold; }
    </style>
    """, unsafe_allow_html=True)

# --- BACKEND CORE ---
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
        df.columns = df.columns.str.strip().str.title()
        return df
    except: return pd.DataFrame()

def update_password_backend(username, new_password):
    try:
        service = get_service()
        df = get_data("USERS_CREDENTIALS!A:F")
        # Row dhoondna (Index starts at 0, Excel row starts at 1, Header is Row 1)
        # Is liye index + 2 karenge
        row_idx = df[df['Username'] == username].index[0] + 2
        
        # 1. Update Password (Column E)
        service.spreadsheets().values().update(
            spreadsheetId=SHEET_ID, range=f"USERS_CREDENTIALS!E{row_idx}",
            valueInputOption="RAW", body={'values': [[new_password]]}).execute()
        
        # 2. Set Is_First_Login to FALSE (Column F)
        service.spreadsheets().values().update(
            spreadsheetId=SHEET_ID, range=f"USERS_CREDENTIALS!F{row_idx}",
            valueInputOption="RAW", body={'values': [["FALSE"]]}).execute()
        return True
    except: return False

# --- HEADER ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.balloons()

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- LOGIN & FORCE PASSWORD CHANGE ---
if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        role = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty'])
        if role != '-- SELECT ROLE --':
            name_list = users_df[users_df['Role'] == role]['Full Name'].tolist() if role == 'Faculty' else [role]
            user_sel = st.selectbox("Select Name:", name_list)
            pwd = st.text_input("Enter Password", type="password")
            
            if st.button("VERIFY & ENTER"):
                match = users_df[(users_df['Full Name'] == user_sel) & (users_df['Password'] == pwd)] if role == 'Faculty' else users_df[(users_df['Role'] == role) & (users_df['Password'] == pwd)]
                
                if not match.empty:
                    st.session_state.temp_user = match.iloc[0].to_dict()
                    # Check if first time
                    if st.session_state.temp_user['Is_First_Login'].upper() == 'TRUE':
                        st.session_state.needs_password_change = True
                    else:
                        st.session_state.logged_in = True
                        st.session_state.user = st.session_state.temp_user
                    st.rerun()
                else: st.error("Invalid Credentials")

    if 'needs_password_change' in st.session_state and st.session_state.needs_password_change:
        st.markdown("---")
        st.warning("🔒 Security Alert: Pehli baar login par apna password tabdeel karein!")
        new_p = st.text_input("Naya Password Likhein", type="password")
        confirm_p = st.text_input("Naya Password Dobara Likhein", type="password")
        
        if st.button("Update & Login"):
            if new_p == confirm_p and len(new_p) > 4:
                if update_password_backend(st.session_state.temp_user['Username'], new_p):
                    st.success("✅ Password updated in Google Sheet! Please login again.")
                    del st.session_state.needs_password_change
                    st.rerun()
                else: st.error("Database connection error!")
            else: st.error("Passwords match nahi kar rahe ya password bohat chota hai.")

else:
    # DASHBOARD
    u = st.session_state.user
    st.sidebar.success(f"Log: {u['Full Name']}")
    st.title(f"🛡️ {u['Role']} Dashboard")
    
    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
