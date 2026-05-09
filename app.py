import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime
import base64

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- UI STYLING & GLOW EFFECT ---
st.markdown("""
    <style>
    .gateway-master { background-color: #0d1b2a; padding: 25px; border-radius: 20px; color: white; text-align: center; border: 2px solid #1b263b; box-shadow: 0px 10px 30px rgba(0,0,0,0.8); }
    .glow-welcome { color: #fff; animation: glow 1s infinite alternate; font-family: 'Arial Black', sans-serif; font-size: 32px; margin: 0; }
    @keyframes glow { from { text-shadow: 0 0 10px #FFD700; } to { text-shadow: 0 0 30px #FFA500; } }
    .stButton>button { background-color: #28a745; color: white; font-weight: bold; border-radius: 10px; height: 3em; }
    .main { background-color: #0d1b2a; color: white; }
    div[data-testid="stExpander"] { background-color: #1b263b; border: 1px solid #FFD700; }
    </style>
    """, unsafe_allow_html=True)

# --- BACKEND FUNCTIONS ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    service = get_service()
    result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
    values = result.get('values', [])
    if not values: return pd.DataFrame()
    df = pd.DataFrame(values[1:], columns=values[0])
    df.columns = df.columns.str.strip()
    return df

def submit_to_sheet(rows):
    service = get_service()
    body = {'values': rows}
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:R",
        valueInputOption="RAW", body=body).execute()

# --- HEADER SECTION ---
st.markdown(f"""
<div class="gateway-master">
    <h2 class="glow-welcome">WELCOME TO THE</h2>
    <h1 style="color:white; font-size:24px; text-transform:uppercase;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- AUTHENTICATION ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.subheader("🔒 SYSTEM AUTHENTICATION")
        role = st.selectbox("Login As:", ['-- SELECT ROLE --', 'HEAD OF ALLIED HEALTH SCIENCES', 'COORDINATOR OF ALLIED HEALTH SCIENCES', 'FACULTY MEMBER', 'STUDENT'])
        password = st.text_input("Password", type="password") if role != 'STUDENT' else ""
        
        if st.button("ENTER PORTAL"):
            users_df = get_data("USERS CREDENTIALS!A:F")
            if role == 'STUDENT':
                st.session_state.logged_in = True
                st.session_state.role = 'STUDENT'
                st.rerun()
            else:
                match = users_df[(users_df['Role'] == role) & (users_df['Password'] == password)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("Access Denied!")

else:
    role = st.session_state.user_data['Role'] if 'user_data' in st.session_state else 'STUDENT'
    
    # --- 1. FACULTY DASHBOARD ---
    if role == 'FACULTY MEMBER':
        st.markdown("<h2 style='color:#FFD700;'>🎓 FACULTY REGULATORY PORTAL</h2>", unsafe_allow_html=True)
        df_students = get_data("STUDENTS LIST!A:Z")
        
        c1, c2 = st.columns(2)
        inst_name = c1.text_input("Instructor Name", value=st.session_state.user_data['Full Name'])
        dept = c2.selectbox("Inst. Dept", ['Radiology', 'MLT', 'Dental', 'Anaesthesia'])
        
        c3, c4 = st.columns(2)
        disc = c3.selectbox("Discipline", df_students['DISCIPLINE'].unique())
        batch = c4.selectbox("Batch", df_students['BATCH'].unique())
        
        # Auto-Semester Logic
        student_match = df_students[(df_students['BATCH'] == batch) & (df_students['DISCIPLINE'] == disc)]
        semester = student_match.iloc[0]['SEMESTER'] if not student_match.empty else "N/A"
        st.text_input("Semester", value=semester, disabled=True)
        
        subj = st.text_input("Subject Name")
        topic = st.text_area("Lecture Record")
        
        if st.button("LOAD STUDENT LIST"):
            st.session_state.current_students = student_match
            
        if 'current_students' in st.session_state:
            st.markdown("### 📋 PARTICULAR STUDENT LIST")
            attendance_data = []
            for i, row in st.session_state.current_students.iterrows():
                col_s, col_a = st.columns([3, 2])
                status = col_a.radio(f"{row['STUDENT NAME']}", ["P", "A", "L", "S/L"], horizontal=True, key=i)
                attendance_data.append([row['STUDENT NAME'], row['Father Name'], status])
            
            if st.button("SUBMIT ATTENDANCE"):
                ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                final_rows = []
                total_fines = 0
                for name, f_name, stat in attendance_data:
                    fine = 100 if stat == "A" else 0
                    total_fines += fine
                    final_rows.append([ts.split()[0], ts.split()[1], "Day", "Slot", inst_name.upper(), dept, disc, subj.upper(), "Start", "End", "Duration", topic, name, f_name, stat, fine, batch, semester])
                
                submit_to_sheet(final_rows)
                st.balloons()
                st.success(f"✅ CONGRATULATIONS! Data Recorded. Total Fine: Rs. {total_fines}")

    # --- 2. HOD DASHBOARD ---
    elif role == 'HEAD OF ALLIED HEALTH SCIENCES':
        st.markdown("<h1 style='color:#FFD700;'>🛡️ HOD EXECUTIVE PANEL</h1>", unsafe_allow_html=True)
        st.metric("Total Collected Fines", "Rs. 608,800")
        # Mazeed Analytics yahan aayenge

    # --- 3. STUDENT DASHBOARD ---
    elif role == 'STUDENT':
        st.markdown("<h2 style='color:#FFD700;'>🧑‍🎓 STUDENT TRANSPARENCY PORTAL</h2>", unsafe_allow_html=True)
        # Student Search logic
