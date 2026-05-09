import streamlit as st
import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from datetime import datetime

st.set_page_config(page_title="TPIHS | Portal", layout="wide", initial_sidebar_state="expanded")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Arial+Black&display=swap');
* { font-family: Arial, sans-serif; }
.stApp, .main, section[data-testid="stSidebar"] { background-color: #0d1b2a !important; }
.stApp { background-color: #0d1b2a !important; }
header[data-testid="stHeader"] { background-color: #001d3d !important; border-bottom: 2px solid #FFD700; }
h1, h2, h3, h4, h5, h6 { color: #FFD700 !important; font-family: 'Arial Black', sans-serif !important; }
p, label, .stMarkdown, div[data-testid="stMarkdownContainer"] p { color: white !important; }
.stTextInput > label, .stSelectbox > label, .stTextArea > label, .stRadio > label { color: white !important; }
.stTextInput > div > input { background-color: #1b263b !important; color: white !important; border: 1px solid #FFD700 !important; border-radius: 8px !important; }
.stTextInput > div > input:focus { border: 2px solid #FFA500 !important; }
input[type="password"] { background-color: #1b263b !important; color: white !important; border: 1px solid #FFD700 !important; border-radius: 8px !important; }
.stButton > button { background-color: #FFD700 !important; color: #0d1b2a !important; font-weight: bold !important; border-radius: 10px !important; border: none !important; font-size: 16px !important; padding: 10px !important; }
.stButton > button:hover { background-color: #FFA500 !important; transform: scale(1.02); }
.stSelectbox > div > div { background-color: #1b263b !important; color: white !important; border: 1px solid #FFD700 !important; border-radius: 8px !important; }
.stTextArea > div > textarea { background-color: #1b263b !important; color: white !important; border: 1px solid #FFD700 !important; border-radius: 8px !important; }
div[data-testid="metric-container"] { background-color: #1b263b !important; border: 2px solid #FFD700 !important; border-radius: 12px !important; padding: 15px !important; }
div[data-testid="metric-container"] label { color: #FFD700 !important; }
div[data-testid="metric-container"] div { color: white !important; }
.stTabs [data-baseweb="tab-list"] { background-color: #001d3d !important; border-bottom: 2px solid #FFD700 !important; }
.stTabs [data-baseweb="tab"] { background-color: #001d3d !important; color: white !important; border-radius: 8px 8px 0 0 !important; }
.stTabs [aria-selected="true"] { background-color: #FFD700 !important; color: #0d1b2a !important; font-weight: bold !important; }
section[data-testid="stSidebar"] { background-color: #001d3d !important; border-right: 2px solid #FFD700 !important; }
.stDataFrame { background-color: #1b263b !important; border: 1px solid #FFD700 !important; border-radius: 8px !important; }
.stSuccess { background-color: #1b263b !important; border: 1px solid #28a745 !important; border-radius: 8px !important; }
.stError { background-color: #1b263b !important; border: 1px solid #dc3545 !important; border-radius: 8px !important; }
.stInfo { background-color: #1b263b !important; border: 1px solid #FFD700 !important; border-radius: 8px !important; }
.stRadio > div { background-color: #1b263b !important; border-radius: 8px !important; padding: 5px !important; }
.stRadio > div > label { color: white !important; }
div[data-testid="stSidebarContent"] { background-color: #001d3d !important; }
</style>
""", unsafe_allow_html=True)

SHEET_ID = '124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4'

@st.cache_resource
def init_connection():
    try:
        key_dict = dict(st.secrets["gcp_service_account"])
        creds = Credentials.from_service_account_info(key_dict, scopes=["https://www.googleapis.com/auth/spreadsheets"])
        return build('sheets', 'v4', credentials=creds)
    except Exception as e:
        st.error(f"Connection Error: {e}")
        return None

service = init_connection()

@st.cache_data(ttl=60)
def load_users():
    result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="USERS CREDENTIALS!A:Z").execute()
    values = result.get('values', [])
    return pd.DataFrame(values[1:], columns=values[0])

@st.cache_data(ttl=60)
def load_students():
    result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="TUDENTS LIST!A:Z").execute()
    values = result.get('values', [])
    return pd.DataFrame(values[1:], columns=values[0])

def append_row(range_name, row):
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID, range=range_name,
        valueInputOption='RAW', body={'values': [row]}
    ).execute()

if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'user' not in st.session_state:
    st.session_state.user = None

def show_login():
    st.markdown("""
    <div style='text-align:center; padding:30px; background-color:#001d3d; border-radius:20px; border:3px solid #FFD700; margin-bottom:30px;'>
        <h1 style='color:#FFD700; font-size:36px; margin:0;'>🎓 ALLIED HEALTH SCIENCES PORTAL</h1>
        <h3 style='color:white; margin:10px 0 0 0;'>THE PROFESSIONALS INSTITUTE OF HEALTH SCIENCES</h3>
        <p style='color:#FFD700; margin:5px 0 0 0;'>MARDAN, KPK, PAKISTAN</p>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1,2,1])
    with col2:
        st.markdown("""
        <div style='background-color:#1b263b; padding:25px; border-radius:15px; border:2px solid #FFD700; margin-bottom:25px;'>
            <h4 style='color:#FFD700; text-align:center; margin-top:0;'>🔒 AUTHORIZED ACCESS ONLY</h4>
            <table style='width:100%; color:white; font-size:15px;'>
                <tr><td>🛡️</td><td><b style='color:#FFD700;'>HOD</b> — Full System Control & Monitoring</td></tr>
                <tr><td style='padding-top:8px;'>📋</td><td style='padding-top:8px;'><b style='color:#FFD700;'>Coordinator</b> — Attendance & Lecture Monitoring</td></tr>
                <tr><td style='padding-top:8px;'>🎓</td><td style='padding-top:8px;'><b style='color:#FFD700;'>Faculty</b> — Mark Attendance & Lecture Records</td></tr>
                <tr><td style='padding-top:8px;'>🧑‍🎓</td><td style='padding-top:8px;'><b style='color:#FFD700;'>Student</b> — View Personal Attendance Record</td></tr>
            </table>
        </div>
        """, unsafe_allow_html=True)
        u = st.text_input("👤 Username")
        p = st.text_input("🔑 Password", type="password")
        if st.button("🚀 ENTER PORTAL", use_container_width=True):
            df_users = load_users()
            match = df_users[(df_users['Username'].astype(str) == u.strip()) & (df_users['Password'].astype(str) == p.strip())]
            if not match.empty:
                st.session_state.logged_in = True
                st.session_state.user = match.iloc[0].to_dict()
                st.rerun()
            else:
                st.error("❌ Ghalat Username ya Password!")

def show_hod_dashboard():
    user = st.session_state.user
    st.markdown(f"""
    <div style='background-color:#001d3d; padding:20px; border-radius:15px; border:2px solid #FFD700; margin-bottom:20px;'>
        <h2 style='color:#FFD700; margin:0;'>🛡️ HOD DASHBOARD</h2>
        <p style='color:white; margin:5px 0 0 0;'>Welcome, <b>{user['Full Name']}</b> | Department: {user.get('Department','')}</p>
    </div>
    """, unsafe_allow_html=True)

    tab1, tab2, tab3 = st.tabs(["📊 Attendance Overview", "👥 Faculty Management", "📋 Lecture Records"])

    with tab1:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_log = pd.DataFrame(values[1:], columns=values[0])
                col1, col2, col3 = st.columns(3)
                col1.metric("📚 Total Lectures", len(df_log))
                absents = len(df_log[df_log['Status'] == 'A']) if 'Status' in df_log.columns else 0
                col2.metric("❌ Total Absents", absents)
                col3.metric("💰 Total Fines", f"Rs. {absents * 100}")
                st.markdown("---")
                st.dataframe(df_log, use_container_width=True)
            else:
                st.info("Abhi koi attendance record nahi hai.")
        except Exception as e:
            st.error(f"Error: {e}")

    with tab2:
        df_users = load_users()
        faculty = df_users[df_users['Role'] == 'Faculty']
        st.markdown(f"<h4 style='color:#FFD700;'>Total Faculty: {len(faculty)}</h4>", unsafe_allow_html=True)
        st.dataframe(faculty[['Full Name', 'Department', 'Username']], use_container_width=True)

    with tab3:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="LECTURE RECORDS!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_lec = pd.DataFrame(values[1:], columns=values[0])
                st.dataframe(df_lec, use_container_width=True)
            else:
                st.info("Abhi koi lecture record nahi hai.")
        except Exception as e:
            st.error(f"Error: {e}")

def show_coordinator_dashboard():
    user = st.session_state.user
    st.markdown(f"""
    <div style='background-color:#001d3d; padding:20px; border-radius:15px; border:2px solid #FFD700; margin-bottom:20px;'>
        <h2 style='color:#FFD700; margin:0;'>📋 COORDINATOR DASHBOARD</h2>
        <p style='color:white; margin:5px 0 0 0;'>Welcome, <b>{user['Full Name']}</b></p>
    </div>
    """, unsafe_allow_html=True)

    tab1, tab2 = st.tabs(["📊 Attendance Records", "📋 Lecture Records"])

    with tab1:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_log = pd.DataFrame(values[1:], columns=values[0])
                if 'Discipline' in df_log.columns:
                    dept_filter = st.selectbox("🔍 Filter by Department", ["All"] + list(df_log['Discipline'].unique()))
                    if dept_filter != "All":
                        df_log = df_log[df_log['Discipline'] == dept_filter]
                st.dataframe(df_log, use_container_width=True)
            else:
                st.info("Koi record nahi.")
        except Exception as e:
            st.error(f"Error: {e}")

    with tab2:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="LECTURE RECORDS!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                st.dataframe(pd.DataFrame(values[1:], columns=values[0]), use_container_width=True)
            else:
                st.info("Koi record nahi.")
        except Exception as e:
            st.error(f"Error: {e}")

def show_faculty_dashboard():
    user = st.session_state.user
    st.markdown(f"""
    <div style='background-color:#001d3d; padding:20px; border-radius:15px; border:2px solid #FFD700; margin-bottom:20px;'>
        <h2 style='color:#FFD700; margin:0;'>🎓 FACULTY PORTAL</h2>
        <p style='color:white; margin:5px 0 0 0;'>Welcome, <b>{user['Full Name']}</b> | {user.get('Department','')}</p>
    </div>
    """, unsafe_allow_html=True)

    tab1, tab2 = st.tabs(["✅ Mark Attendance", "📋 My Records"])

    with tab1:
        df_students = load_students()
        col1, col2 = st.columns(2)
        with col1:
            discipline = st.selectbox("📚 Discipline", sorted(df_students['DISCIPLINE'].unique()) if 'DISCIPLINE' in df_students.columns else [])
            batch = st.selectbox("🎓 Batch", sorted(df_students['BATCH'].unique()) if 'BATCH' in df_students.columns else [])
        with col2:
            subject = st.text_input("📖 Subject")
            topic = st.text_area("📝 Lecture Topic")

        col3, col4 = st.columns(2)
        with col3:
            slot = st.selectbox("🕐 Slot", ['1','2','3','4'])
            day = st.selectbox("📅 Day", ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
        with col4:
            times = ['08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM']
            start_time = st.selectbox("⏰ Start Time", times)
            end_time = st.selectbox("⏰ End Time", times[1:])

        if discipline and batch:
            filtered = df_students[(df_students['DISCIPLINE'] == discipline) & (df_students['BATCH'] == batch)]
            if not filtered.empty:
                st.markdown("<h3 style='color:#FFD700;'>📋 STUDENT LIST</h3>", unsafe_allow_html=True)
                attendance = {}
                for i, row in filtered.iterrows():
                    col_a, col_b = st.columns([3,2])
                    with col_a:
                        father = row.get('Father Name', '')
                        st.markdown(f"<p style='color:white; margin:8px 0;'><b>{row['STUDENT NAME']}</b> <span style='color:#aaa;'>(S/O {father})</span></p>", unsafe_allow_html=True)
                    with col_b:
                        status = st.radio("", ['P','A','L','S/L'], key=f"att_{i}", horizontal=True)
                        attendance[row['STUDENT NAME']] = status

                if st.button("✅ SUBMIT ATTENDANCE", use_container_width=True):
                    now = datetime.now()
                    for name, status in attendance.items():
                        fine = 100 if status == 'A' else 0
                        student_row = filtered[filtered['STUDENT NAME'] == name].iloc[0]
                        append_row("ATTENDANCE HISTORY!A:A", [
                            now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"),
                            day, slot, user['Full Name'], user.get('Department',''),
                            discipline, subject.upper(), start_time, end_time,
                            topic, name, student_row.get('Father Name',''), status, fine,
                            batch, student_row.get('SEMESTER','')
                        ])
                    st.success("✅ MUBARAK HO! Attendance successfully submit ho gayi!")
                    st.balloons()

    with tab2:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_log = pd.DataFrame(values[1:], columns=values[0])
                if 'Instructor Name' in df_log.columns:
                    my_records = df_log[df_log['Instructor Name'] == user['Full Name']]
                    st.dataframe(my_records, use_container_width=True)
                else:
                    st.dataframe(df_log, use_container_width=True)
            else:
                st.info("Koi record nahi.")
        except Exception as e:
            st.error(f"Error: {e}")

def show_student_dashboard():
    user = st.session_state.user
    st.markdown(f"""
    <div style='background-color:#001d3d; padding:20px; border-radius:15px; border:2px solid #FFD700; margin-bottom:20px;'>
        <h2 style='color:#FFD700; margin:0;'>🧑‍🎓 STUDENT PORTAL</h2>
        <p style='color:white; margin:5px 0 0 0;'>Welcome, <b>{user['Full Name']}</b></p>
    </div>
    """, unsafe_allow_html=True)

    try:
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
        values = result.get('values', [])
        if len(values) > 1:
            df_log = pd.DataFrame(values[1:], columns=values[0])
            if 'Student Name' in df_log.columns:
                my_records = df_log[df_log['Student Name'].astype(str).str.strip() == user['Full Name'].strip()]
                col1, col2, col3 = st.columns(3)
                total = len(my_records)
                absents = len(my_records[my_records['Status'] == 'A']) if 'Status' in my_records.columns else 0
                col1.metric("📚 Total Classes", total)
                col2.metric("❌ Total Absents", absents)
                col3.metric("💰 Total Fine", f"Rs. {absents * 100}")
                st.markdown("---")
                st.dataframe(my_records, use_container_width=True)
        else:
            st.info("Koi record nahi.")
    except Exception as e:
        st.error(f"Error: {e}")

if service:
    if not st.session_state.logged_in:
        show_login()
    else:
        user = st.session_state.user
        role = user.get('Role', '')
        with st.sidebar:
            st.markdown(f"""
            <div style='text-align:center; padding:15px; background-color:#0d1b2a; border-radius:10px; border:1px solid #FFD700;'>
                <h3 style='color:#FFD700; margin:0;'>👤 {user['Full Name']}</h3>
                <p style='color:white; margin:5px 0 0 0;'>{role}</p>
                <p style='color:#aaa; margin:3px 0 0 0;'>{user.get('Department','')}</p>
            </div>
            """, unsafe_allow_html=True)
            st.markdown("---")
            if st.button("🚪 Logout", use_container_width=True):
                st.session_state.logged_in = False
                st.session_state.user = None
                st.rerun()

        if role == 'HOD':
            show_hod_dashboard()
        elif role == 'Coordinator':
            show_coordinator_dashboard()
        elif role == 'Faculty':
            show_faculty_dashboard()
        else:
            show_student_dashboard()
