import streamlit as st
import pandas as pd
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import json

# --- 1. PAGE SETUP ---
st.set_page_config(page_title="Department of Allied Health Sciences", layout="wide", page_icon="🎓")

# --- 2. GOOGLE SHEETS CONNECTION ---
@st.cache_resource
def init_connection():
    key_dict = json.loads(st.secrets["gcp_service_account"])
    creds = Credentials.from_service_account_info(
        key_dict, 
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    return gspread.authorize(creds)

gc = init_connection()

# ⚠️ YAHAN APNI GOOGLE SHEET KA ASLI LINK PASTE KAREIN (Single quotes ke andar)
SHEET_URL = 'https://docs.google.com/spreadsheets/d/124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4/edit?gid=1459478475#gid=1459478475'

@st.cache_data(ttl=60)
def load_data():
    sh = gc.open_by_url(https://docs.google.com/spreadsheets/d/124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4/edit?gid=1459478475#gid=1459478475)
    
    users_sheet = sh.worksheet('USERS_CREDENTIALS')
    student_sheet = sh.get_worksheet(0)
    log_sheet = sh.get_worksheet(1)
    
    df_users = pd.DataFrame(users_sheet.get_all_records())
    df_students = pd.DataFrame(student_sheet.get_all_records())
    df_students.columns = df_students.columns.str.strip()
    # Pandas applymap warning fix
    try:
        df_students = df_students.map(lambda x: str(x).strip() if isinstance(x, str) else x)
    except AttributeError:
        df_students = df_students.applymap(lambda x: str(x).strip() if isinstance(x, str) else x)
        
    return sh, users_sheet, log_sheet, df_users, df_students

sh, users_sheet, log_sheet, df_users, df_students = load_data()

# --- 3. THEME ---
st.markdown("""
<style>
    .stApp { background-color: #0d1b2a; color: white; }
    h1, h2, h3 { color: #FFD700; text-align: center; }
    .welcome-text { text-align: center; font-size: 24px; font-weight: bold; color: white; }
    .success-box { background-color: #001d3d; padding: 20px; border: 2px solid #FFD700; border-radius: 10px; text-align: center; margin-top: 15px; }
</style>
""", unsafe_allow_html=True)

# --- 4. HEADER ---
st.markdown("<h1>WELCOME TO THE</h1>", unsafe_allow_html=True)
st.markdown("<p class='welcome-text'>DEPARTMENT OF ALLIED HEALTH SCIENCES</p>", unsafe_allow_html=True)
st.divider()

# --- 5. SYSTEM LOGIN LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.username = ""
    st.session_state.role = ""
    st.session_state.must_change_pass = False
    st.session_state.row_idx = None

if not st.session_state.logged_in:
    st.subheader("🔒 SYSTEM AUTHENTICATION")
    login_type = st.radio("Select Portal:", ["STAFF LOGIN", "STUDENT PORTAL"], horizontal=True)
    
    if login_type == "STUDENT PORTAL":
        st.info("Student Portal Access (No Login Required)")
        if st.button("ENTER STUDENT PORTAL"):
            st.session_state.logged_in = True
            st.session_state.role = "STUDENT"
            st.rerun()
            
    elif login_type == "STAFF LOGIN":
        with st.form("login_form"):
            user_input = st.text_input("Username")
            pass_input = st.text_input("Password", type="password")
            submit_btn = st.form_submit_button("SECURE LOGIN")
            
            if submit_btn:
                user_val = user_input.strip()
                pass_val = pass_input.strip()
                match = df_users[(df_users['Username'] == user_val) & (df_users['Password'].astype(str) == str(pass_val))]
                
                if not match.empty:
                    user_data = match.iloc[0]
                    st.session_state.logged_in = True
                    st.session_state.username = user_val
                    st.session_state.role = user_data['Role']
