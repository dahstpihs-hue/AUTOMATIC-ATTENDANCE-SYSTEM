import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- ELITE UI STYLING & BLINKING EFFECT ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black', sans-serif; font-size: 32px;
        color: #FFD700; animation: blinker 1.5s linear infinite;
        text-align: center; text-shadow: 0 0 20px #FFA500;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 30px; border-radius: 20px; 
        border: 2px solid #FFD700; box-shadow: 0px 10px 40px rgba(0,0,0,0.9);
        text-align: center; margin-bottom: 25px;
    }
    .stButton>button { 
        width: 100%; background-image: linear-gradient(to right, #28a745, #218838); 
        color: white; font-weight: bold; border-radius: 10px; height: 3.5em; border: none;
    }
    </style>
    """, unsafe_allow_html=True)

# --- BACKEND FUNCTIONS ---
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
    except Exception: return pd.DataFrame()

def submit_attendance(rows):
    service = get_service()
    body = {'values': rows}
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range="'ATTENDANCE HISTORY'!A:R",
        valueInputOption="RAW", body=body).execute()

# --- HEADER & BALLOONS ---
if 'first_load' not in st.session_state:
    st.balloons()
    st.session_state.first_load = True

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:26px; letter-spacing: 2px; margin-top:0px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- LOGIN LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("'USERS CREDENTIALS'!A:F")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER'])
        
        if role_selection in ['HOD', 'COORDINATOR']:
            pass_input = st.text_input("PASSWORD", type="password")
            if st.button("AUTHORIZE"):
                match = users_df[(users_df['Role'].str.strip() == role_selection) & (users_df['Password'].str.strip() == pass_input)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Incorrect Password")

        elif role_selection == 'FACULTY MEMBER':
            names = users_df[users_df['Role'].str.strip() == 'Faculty']['Full Name'].tolist()
            name_in = st.selectbox("SELECT YOUR NAME:", names)
            pass_in = st.text_input("PASSWORD", type="password")
            if st.button("VERIFY FACULTY"):
                match = users_df[(users_df['Full Name'].str.strip() == name_in) & (users_df['Password'].str.strip() == pass_in)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Incorrect Credentials")

else:
    # --- TEACHER DASHBOARD ---
    user = st.session_state.user
    teacher_dept = user.get('Department', 'GENERAL') # Automatically tracing department
    
    st.sidebar.success(f"Teacher: {user['Full Name']}")
    st.sidebar.info(f"Department: {teacher_dept}")
    
    st.markdown(f"## 📝 Marking Records: {teacher_dept}")
    
    df_students = get_data("'STUDENTS LIST'!A:Z")
    
    col1, col2 = st.columns(2)
    with col1:
        selected_disc = st.selectbox("1. Discipline", df_students['DISCIPLINE'].unique() if not df_students.empty else [])
    with col2:
        selected_batch = st.selectbox("2. Batch", df_students['BATCH'].unique() if not df_students.empty else [])

    # Auto-Semester
    match = df_students[(df_students['BATCH'] == selected_batch) & (df_students['DISCIPLINE'] == selected_disc)]
    semester = match.iloc[0]['SEMESTER'] if not match.empty else "N/A"
    
    # Auto Date & Day
    now = datetime.now()
    st.warning(f"📅 {now.strftime('%Y-%m-%d')} | {now.strftime('%A')} | {semester} Semester")

    subject = st.text_input("📖 Subject Name")
    topic = st.text_area("🗒️ Lecture Record (Topic)")

    if not match.empty:
        st.markdown("### 📋 Student List")
        attendance_results = []
        for i, row in match.iterrows():
            c_n, c_s = st.columns([3, 2])
            status = c_s.radio(f"{row['STUDENT NAME']}", ["P", "A", "L", "S/L"], horizontal=True, key=f"at_{i}")
            attendance_results.append({"name": row['STUDENT NAME'], "father": row['Father Name'], "status": status})

        if st.button("✅ SUBMIT RECORD TO DATABASE"):
            if not subject or not topic:
                st.error("Please enter Subject and Topic!")
            else:
                final_rows = []
                for res in attendance_results:
                    fine = 100 if res['status'] == 'A' else 0
                    final_rows.append([
                        now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), now.strftime("%A"), 
                        "Slot", user['Full Name'], teacher_dept, selected_disc, 
                        subject.upper(), "Start", "End", "Duration", 
                        topic, res['name'], res['father'], res['status'], 
                        fine, selected_batch, semester
                    ])
                submit_attendance(final_rows)
                st.balloons()
                st.success(f"✅ DATA RECORDED SUCCESSFULLY FOR {teacher_dept}")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
