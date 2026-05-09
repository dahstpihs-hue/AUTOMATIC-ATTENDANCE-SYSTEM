import streamlit as st
import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from datetime import datetime

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="TPIHS | Portal", layout="wide")
SHEET_ID = '124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4'

# --- 2. CONNECTION ---
@st.cache_resource
def init_connection():
    try:
        key_dict = dict(st.secrets["gcp_service_account"])
        creds = Credentials.from_service_account_info(
            key_dict,
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        service = build('sheets', 'v4', credentials=creds)
        return service
    except Exception as e:
        st.error(f"Connection Error: {e}")
        return None

service = init_connection()

# --- 3. LOAD DATA ---
@st.cache_data(ttl=60)
def load_users():
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=SHEET_ID, range="USERS CREDENTIALS!A:Z").execute()
    values = result.get('values', [])
    return pd.DataFrame(values[1:], columns=values[0])

@st.cache_data(ttl=60)
def load_students():
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=SHEET_ID, range="TUDENTS LIST!A:Z").execute()
    values = result.get('values', [])
    return pd.DataFrame(values[1:], columns=values[0])

def append_row(range_name, row):
    sheet = service.spreadsheets()
    sheet.values().append(
        spreadsheetId=SHEET_ID,
        range=range_name,
        valueInputOption='RAW',
        body={'values': [row]}
    ).execute()

# --- 4. SESSION STATE ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'user' not in st.session_state:
    st.session_state.user = None

# --- 5. LOGIN PAGE ---
def show_login():
    st.markdown("<h1 style='text-align:center; color:#FFD700;'>🎓 ALLIED HEALTH SCIENCES PORTAL</h1>", unsafe_allow_html=True)
    st.markdown("<h3 style='text-align:center; color:white;'>TPIHS | Mardan</h3>", unsafe_allow_html=True)
    st.markdown("---")
    col1, col2, col3 = st.columns([1,2,1])
    with col2:
        u = st.text_input("Username")
        p = st.text_input("Password", type="password")
        if st.button("LOGIN", use_container_width=True):
            df_users = load_users()
            match = df_users[(df_users['Username'].astype(str) == u.strip()) & (df_users['Password'].astype(str) == p.strip())]
            if not match.empty:
                st.session_state.logged_in = True
                st.session_state.user = match.iloc[0].to_dict()
                st.rerun()
            else:
                st.error("❌ Ghalat Username ya Password!")

# --- 6. HOD DASHBOARD ---
def show_hod_dashboard():
    user = st.session_state.user
    st.markdown(f"<h2 style='color:#FFD700;'>🛡️ HOD DASHBOARD — {user['Full Name']}</h2>", unsafe_allow_html=True)
    
    tab1, tab2, tab3 = st.tabs(["📊 Attendance Overview", "👥 Faculty Management", "📋 Lecture Records"])
    
    with tab1:
        st.subheader("📊 Attendance Overview")
        try:
            sheet = service.spreadsheets()
            result = sheet.values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_log = pd.DataFrame(values[1:], columns=values[0])
                col1, col2, col3 = st.columns(3)
                col1.metric("Total Lectures", len(df_log))
                absents = len(df_log[df_log['Status'] == 'A']) if 'Status' in df_log.columns else 0
                col2.metric("Total Absents", absents)
                col3.metric("Total Fines", f"Rs. {absents * 100}")
                st.dataframe(df_log, use_container_width=True)
            else:
                st.info("Abhi koi attendance record nahi hai.")
        except Exception as e:
            st.error(f"Error: {e}")

    with tab2:
        st.subheader("👥 Faculty List")
        df_users = load_users()
        faculty = df_users[df_users['Role'] == 'Faculty']
        st.dataframe(faculty[['Full Name', 'Department', 'Username']], use_container_width=True)

    with tab3:
        st.subheader("📋 Lecture Records")
        try:
            sheet = service.spreadsheets()
            result = sheet.values().get(spreadsheetId=SHEET_ID, range="LECTURE RECORDS!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_lec = pd.DataFrame(values[1:], columns=values[0])
                st.dataframe(df_lec, use_container_width=True)
            else:
                st.info("Abhi koi lecture record nahi hai.")
        except Exception as e:
            st.error(f"Error: {e}")

# --- 7. COORDINATOR DASHBOARD ---
def show_coordinator_dashboard():
    user = st.session_state.user
    st.markdown(f"<h2 style='color:#FFD700;'>📋 COORDINATOR DASHBOARD — {user['Full Name']}</h2>", unsafe_allow_html=True)
    
    tab1, tab2 = st.tabs(["📊 Attendance Records", "📋 Lecture Records"])
    
    with tab1:
        st.subheader("📊 Attendance Records")
        try:
            sheet = service.spreadsheets()
            result = sheet.values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_log = pd.DataFrame(values[1:], columns=values[0])
                if 'Discipline' in df_log.columns:
                    dept_filter = st.selectbox("Department Filter", ["All"] + list(df_log['Discipline'].unique()))
                    if dept_filter != "All":
                        df_log = df_log[df_log['Discipline'] == dept_filter]
                st.dataframe(df_log, use_container_width=True)
            else:
                st.info("Koi record nahi.")
        except Exception as e:
            st.error(f"Error: {e}")

    with tab2:
        st.subheader("📋 Lecture Records")
        try:
            sheet = service.spreadsheets()
            result = sheet.values().get(spreadsheetId=SHEET_ID, range="LECTURE RECORDS!A:Z").execute()
            values = result.get('values', [])
            if len(values) > 1:
                df_lec = pd.DataFrame(values[1:], columns=values[0])
                st.dataframe(df_lec, use_container_width=True)
            else:
                st.info("Koi record nahi.")
        except Exception as e:
            st.error(f"Error: {e}")

# --- 8. FACULTY DASHBOARD ---
def show_faculty_dashboard():
    user = st.session_state.user
    st.markdown(f"<h2 style='color:#FFD700;'>🎓 FACULTY PORTAL — {user['Full Name']}</h2>", unsafe_allow_html=True)

    tab1, tab2 = st.tabs(["✅ Mark Attendance", "📋 My Lecture Records"])

    with tab1:
        st.subheader("✅ Mark Attendance")
        df_students = load_students()

        col1, col2 = st.columns(2)
        with col1:
            discipline = st.selectbox("Discipline", sorted(df_students['DISCIPLINE'].unique()) if 'DISCIPLINE' in df_students.columns else [])
            batch = st.selectbox("Batch", sorted(df_students['BATCH'].unique()) if 'BATCH' in df_students.columns else [])
        with col2:
            subject = st.text_input("Subject")
            topic = st.text_area("Lecture Topic")

        col3, col4 = st.columns(2)
        with col3:
            slot = st.selectbox("Slot", ['1','2','3','4'])
            day = st.selectbox("Day", ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
        with col4:
            times = ['08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM']
            start_time = st.selectbox("Start Time", times)
            end_time = st.selectbox("End Time", times[1:])

        if discipline and batch:
            filtered = df_students[(df_students['DISCIPLINE'] == discipline) & (df_students['BATCH'] == batch)]
            if not filtered.empty:
                st.markdown("### 📋 Student List")
                attendance = {}
                for i, row in filtered.iterrows():
                    col_a, col_b = st.columns([3,2])
                    with col_a:
                        father = row.get('Father Name', '')
                        st.write(f"**{row['STUDENT NAME']}** (S/O {father})")
                    with col_b:
                        status = st.radio("", ['P','A','L','S/L'], key=f"att_{i}", horizontal=True)
                        attendance[row['STUDENT NAME']] = status

                if st.button("✅ SUBMIT ATTENDANCE", use_container_width=True):
                    now = datetime.now()
                    for name, status in attendance.items():
                        fine = 100 if status == 'A' else 0
                        student_row = filtered[filtered['STUDENT NAME'] == name].iloc[0]
                        father = student_row.get('Father Name', '')
                        semester = student_row.get('SEMESTER', '')
                        append_row("ATTENDANCE HISTORY!A:A", [
                            now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"),
                            day, slot, user['Full Name'], user.get('Department',''),
                            discipline, subject.upper(), start_time, end_time,
                            topic, name, father, status, fine, batch, semester
                        ])
                    st.success("✅ Attendance submitted successfully!")
                    st.balloons()

    with tab2:
        st.subheader("📋 My Lecture Records")
        try:
            sheet = service.spreadsheets()
            result = sheet.values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
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

# --- 9. STUDENT DASHBOARD ---
def show_student_dashboard():
    user = st.session_state.user
    st.markdown(f"<h2 style='color:#FFD700;'>🧑‍🎓 STUDENT PORTAL — {user['Full Name']}</h2>", unsafe_allow_html=True)
    
    try:
        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:Z").execute()
        values = result.get('values', [])
        if len(values) > 1:
            df_log = pd.DataFrame(values[1:], columns=values[0])
            if 'Student Name' in df_log.columns:
                my_records = df_log[df_log['Student Name'].astype(str).str.strip() == user['Full Name'].strip()]
                col1, col2, col3 = st.columns(3)
                total = len(my_records)
                absents = len(my_records[my_records['Status'] == 'A']) if 'Status' in my_records.columns else 0
                col1.metric("Total Classes", total)
                col2.metric("Total Absents", absents)
                col3.metric("Total Fine", f"Rs. {absents * 100}")
                st.dataframe(my_records, use_container_width=True)
        else:
            st.info("Koi record nahi.")
    except Exception as e:
        st.error(f"Error: {e}")

# --- 10. MAIN ROUTER ---
if service:
    if not st.session_state.logged_in:
        show_login()
    else:
        user = st.session_state.user
        role = user.get('Role', '')

        with st.sidebar:
            st.markdown(f"**👤 {user['Full Name']}**")
            st.markdown(f"*{role} — {user.get('Department','')}*")
            if st.button("🚪 Logout"):
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
