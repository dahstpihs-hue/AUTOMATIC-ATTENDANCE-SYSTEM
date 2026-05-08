import streamlit as st
import pandas as pd
import gspread
from google.oauth2.service_account import Credentials
import json
from datetime import datetime

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="TPIHS | Allied Health Sciences", layout="wide", page_icon="🎓")

# --- 2. DATABASE CONNECTION ---
@st.cache_resource
def init_connection():
    try:
        key_dict = json.loads(st.secrets["gcp_service_account"])
        creds = Credentials.from_service_account_info(
            key_dict, 
            scopes=["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        )
        return gspread.authorize(creds)
    except Exception as e:
        st.error(f"Secret Key Error: {e}")
        return None

gc = init_connection()

# --- 3. LOAD DATA (USING SHEET ID) ---
SHEET_ID = '124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4'

@st.cache_data(ttl=60)
def load_data():
    try:
        sh = gc.open_by_key(SHEET_ID)
        # Tabs ke naam: 'USERS_CREDENTIALS', 'STUDENTS', 'LOGS'
        users_sheet = sh.worksheet('USERS_CREDENTIALS')
        student_sheet = sh.get_worksheet(0) 
        log_sheet = sh.get_worksheet(1)     
        
        df_users = pd.DataFrame(users_sheet.get_all_records())
        df_students = pd.DataFrame(student_sheet.get_all_records())
        df_logs = pd.DataFrame(log_sheet.get_all_records())
        
        return sh, log_sheet, df_users, df_students, df_logs
    except Exception as e:
        st.error(f"Database Access Error: {e}")
        st.stop()

if gc:
    sh, log_sheet, df_users, df_students, df_logs = load_data()

# --- 4. STYLING ---
st.markdown("""
<style>
    .main { background-color: #0d1b2a; color: white; }
    .stButton>button { width: 100%; background-color: #FFD700; color: black; font-weight: bold; }
    .report-card { background-color: #1b263b; padding: 15px; border-radius: 10px; border: 1px solid #FFD700; }
</style>
""", unsafe_allow_html=True)

# --- 5. AUTHENTICATION LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.user = None
    st.session_state.role = None

if not st.session_state.logged_in:
    st.title("🎓 DEPARTMENT OF ALLIED HEALTH SCIENCES")
    st.subheader("Automated Academic & Attendance System")
    
    tab1, tab2 = st.tabs(["🔒 STAFF LOGIN", "📢 STUDENT PORTAL"])
    
    with tab1:
        with st.form("login_form"):
            u = st.text_input("Username")
            p = st.text_input("Password", type="password")
            if st.form_submit_button("SECURE LOGIN"):
                match = df_users[(df_users['Username'] == u.strip()) & (df_users['Password'].astype(str) == p.strip())]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user = u
                    st.session_state.role = match.iloc[0]['Role']
                    st.rerun()
                else:
                    st.error("Invalid Credentials")
    
    with tab2:
        st.info("Student Portal is Open for Public View")
        if st.button("ENTER AS STUDENT"):
            st.session_state.logged_in = True
            st.session_state.role = "Student"
            st.rerun()

# --- 6. DASHBOARDS ---
else:
    # Top Bar
    c1, c2 = st.columns([4,1])
    c1.title(f"Welcome, {st.session_state.user if st.session_state.user else 'Student'}")
    if c2.button("LOGOUT"):
        st.session_state.clear()
        st.rerun()
    
    # --- COORDINATOR / HOD VIEW ---
    if st.session_state.role in ["HOD", "Coordinator"]:
        st.header("🛡️ COORDINATOR COMMAND CENTER")
        
        # Daily Stats
        m1, m2, m3 = st.columns(3)
        m1.metric("Today's Classes", "5") # Logic later
        m2.metric("Avg. Attendance", "88%")
        m3.metric("Fines Collected", "Rs. 1,200")
        
        st.subheader("📅 Daily Lecture & Attendance Audit")
        if not df_logs.empty:
            st.dataframe(df_logs.tail(10), use_container_width=True)
        else:
            st.warning("No logs found in Sheet.")

    # --- FACULTY VIEW ---
    elif st.session_state.role == "Faculty":
        st.header("📝 FACULTY ATTENDANCE & LOG")
        with st.form("att_form"):
            subj = st.text_input("Subject Name")
            topic = st.text_area("Lecture Topic Covered")
            # Yahan attendance ka table aayega
            if st.form_submit_button("SUBMIT RECORD"):
                st.success("Record Saved to Google Sheet!")

    # --- STUDENT VIEW ---
    else:
        st.header("📊 MY PERFORMANCE REPORT")
        st.write("Student tracking features loading...")
