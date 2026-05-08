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

# --- SHEET URL (FIXED: Added quotes around the link) ---
SHEET_URL = 'https://docs.google.com/spreadsheets/d/124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4/edit#gid=1459478475'

@st.cache_data(ttl=60)
def load_data():
    # FIXED: Using the variable SHEET_URL which has quotes
    sh = gc.open_by_url(SHEET_URL)
    
    # Sheet tabs ke naam
    users_sheet = sh.worksheet('USERS_CREDENTIALS')
    student_sheet = sh.get_worksheet(0)
    log_sheet = sh.get_worksheet(1)
    
    df_users = pd.DataFrame(users_sheet.get_all_records())
    df_students = pd.DataFrame(student_sheet.get_all_records())
    
    df_students.columns = df_students.columns.str.strip()
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
</style>
""", unsafe_allow_html=True)

st.markdown("<h1>DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>", unsafe_allow_html=True)
st.divider()

# --- 4. LOGIN SYSTEM ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.username = ""
    st.session_state.role = ""

if not st.session_state.logged_in:
    login_type = st.radio("Portal:", ["STAFF LOGIN", "STUDENT PORTAL"], horizontal=True)
    if login_type == "STAFF LOGIN":
        with st.form("login"):
            u = st.text_input("Username").strip()
            p = st.text_input("Password", type="password").strip()
            if st.form_submit_button("LOGIN"):
                match = df_users[(df_users['Username'] == u) & (df_users['Password'].astype(str) == p)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.username = u
                    st.session_state.role = match.iloc[0]['Role']
                    st.rerun()
                else:
                    st.error("Invalid Credentials")
    else:
        if st.button("ENTER STUDENT PORTAL"):
            st.session_state.logged_in = True
            st.session_state.role = "STUDENT"
            st.rerun()
else:
    st.write(f"Logged in as: **{st.session_state.username}** ({st.session_state.role})")
    if st.button("LOGOUT"):
        st.session_state.clear()
        st.rerun()
