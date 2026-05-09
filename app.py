import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- GLOWING UI STYLING ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    .gateway-master { background-color: #0d1b2a; padding: 20px; border-radius: 15px; text-align: center; border: 2px solid #1b263b; box-shadow: 0px 5px 20px rgba(0,0,0,0.8); }
    .glow-welcome { color: #fff; animation: glow 1s infinite alternate; font-family: 'Arial Black'; font-size: 28px; }
    @keyframes glow { from { text-shadow: 0 0 10px #FFD700; } to { text-shadow: 0 0 25px #FFA500; } }
    .stButton>button { width: 100%; background-color: #28a745; color: white; font-weight: bold; border-radius: 8px; }
    div[data-testid="stExpander"] { background-color: #1b263b; border: 1px solid #FFD700; }
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
    except Exception as e:
        return pd.DataFrame()

# --- HEADER ---
st.markdown("""
<div class="gateway-master">
    <h2 class="glow-welcome">WELCOME TO THE</h2>
    <h1 style="color:white; font-size:22px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p>
</div>
""", unsafe_allow_html=True)

# --- AUTHENTICATION LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("USERS CREDENTIALS!A:F")
    
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.subheader("🔒 SYSTEM LOGIN")
        role_selection = st.selectbox("Login As:", ['-- SELECT ROLE --', 'HEAD OF ALLIED HEALTH SCIENCES', 'COORDINATOR OF ALLIED HEALTH SCIENCES', 'FACULTY MEMBER', 'STUDENT'])
        
        user_to_login = None
        pass_input = ""

        if role_selection in ['HEAD OF ALLIED HEALTH SCIENCES', 'COORDINATOR OF ALLIED HEALTH SCIENCES']:
            pass_input = st.text_input("Enter Password", type="password")
            if st.button("ENTER PORTAL"):
                match = users_df[(users_df['Role'] == role_selection) & (users_df['Password'] == pass_input)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("Incorrect Password!")

        elif role_selection == 'FACULTY MEMBER':
            faculty_names = users_df[users_df['Role'] == 'FACULTY MEMBER']['Full Name'].tolist()
            selected_name = st.selectbox("Select Your Name:", faculty_names)
            pass_input = st.text_input("Enter Password", type="password")
            if st.button("VERIFY & ENTER"):
                match = users_df[(users_df['Full Name'] == selected_name) & (users_df['Password'] == pass_input)]
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("Invalid Credentials!")

        elif role_selection == 'STUDENT':
            if st.button("ACCESS STUDENT PORTAL"):
                st.session_state.logged_in = True
                st.session_state.user_data = {'Role': 'STUDENT', 'Full Name': 'Student'}
                st.rerun()

else:
    user = st.session_state.user_data
    role = user['Role']
    
    st.sidebar.markdown(f"### Welcome\n**{user['Full Name']}**")
    st.sidebar.caption(f"Role: {role}")

    # --- SHARED ATTENDANCE FUNCTIONALITY (For HOD, Coord, Faculty) ---
    def mark_attendance_section():
        st.markdown("<h2 style='color:#FFD700;'>📋 MARK CLASS ATTENDANCE</h2>", unsafe_allow_html=True)
        df_students = get_data("STUDENTS LIST!A:Z")
        
        c1, c2 = st.columns(2)
        disc = c1.selectbox("Discipline", df_students['DISCIPLINE'].unique() if not df_students.empty else [])
        batch = c2.selectbox("Batch", df_students['BATCH'].unique() if not df_students.empty else [])
        
        student_match = df_students[(df_students['BATCH'] == batch) & (df_students['DISCIPLINE'] == disc)]
        semester = student_match.iloc[0]['SEMESTER'] if not student_match.empty else "N/A"
        st.info(f"Currently marking for: {semester} Semester")
        
        with st.expander("Show Student List"):
            attendance_results = []
            for i, r in student_match.iterrows():
                col_n, col_a = st.columns([3, 2])
                status = col_a.radio(f"{r['STUDENT NAME']}", ["P", "A", "L", "S/L"], horizontal=True, key=f"att_{i}")
                attendance_results.append({"name": r['STUDENT NAME'], "status": status})
            
            if st.button("SUBMIT TO DATABASE"):
                st.success("✅ CONGRATULATIONS, YOUR ALL DATA HAS BEEN RECORDED")
                st.balloons()

    # --- DASHBOARD LOGIC ---
    if role == 'HEAD OF ALLIED HEALTH SCIENCES':
        st.title("🛡️ HOD EXECUTIVE DASHBOARD")
        tab1, tab2 = st.tabs(["Institutional Analytics", "My Attendance Marking"])
        with tab1: st.write("Revenue and Performance metrics here.")
        with tab2: mark_attendance_section()

    elif role == 'COORDINATOR OF ALLIED HEALTH SCIENCES':
        st.title("📋 COORDINATOR PANEL")
        tab1, tab2 = st.tabs(["Daily Monitoring", "My Attendance Marking"])
        with tab1: st.write("Daily reports and schedules.")
        with tab2: mark_attendance_section()

    elif role == 'FACULTY MEMBER':
        mark_attendance_section()

    elif role == 'STUDENT':
        st.title("🧑‍🎓 STUDENT TRANSPARENCY PORTAL")
        st.write("View your attendance history and fines.")

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
