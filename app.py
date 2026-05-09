import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Enterprise Portal", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- 2. ELITE UI STYLING ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black'; font-size: 32px; color: #FFD700;
        animation: blinker 1.5s linear infinite; text-align: center; margin-bottom: 5px;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 20px; border-radius: 20px; 
        border: 2px solid #FFD700; text-align: center; margin-bottom: 20px;
    }
    .calendar-sidebar {
        background-color: #1b263b; padding: 15px; border-radius: 12px;
        border-top: 4px solid #1a73e8; text-align: center; margin-bottom: 20px;
    }
    .stButton>button { width: 100%; border-radius: 10px; height: 3em; font-weight: bold; background-color: #28a745; color: white; }
    .critical-alert { color: #ff4b4b; font-weight: bold; animation: blinker 1s linear infinite; padding: 10px; border: 1px solid red; border-radius: 8px; }
    </style>
    """, unsafe_allow_html=True)

# --- 3. BACKEND ENGINES ---
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
    except: return pd.DataFrame()

def submit_attendance(rows):
    try:
        service = get_service()
        service.spreadsheets().values().append(
            spreadsheetId=SHEET_ID, range="ATTENDANCE HISTORY!A:R",
            valueInputOption="RAW", body={'values': rows}).execute()
        return True
    except: return False

# --- 4. GLOBAL HEADER ---
st.markdown('<div class="gateway-master"><div class="blinking-text">WELCOME TO THE</div><h1 style="color:white; font-size:26px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1><p style="color:#FFD700;">PIHS MARDAN COMMAND CENTER</p></div>', unsafe_allow_html=True)

# --- 5. LOGIN SESSIONS ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    cols = st.columns([1, 1.2, 1])
    with cols[1]:
        role = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty', 'Student'])
        if role != '-- SELECT ROLE --':
            if role == 'Faculty':
                f_names = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
                user_sel = st.selectbox("Select Your Name:", f_names)
            else: user_sel = role
            
            pwd = st.text_input("PASSWORD", type="password")
            if st.button("ENTER PORTAL"):
                match = users_df[(users_df['Full Name'] == user_sel) & (users_df['Password'] == pwd)] if role == 'Faculty' else users_df[(users_df['Role'] == role) & (users_df['Password'] == pwd)]
                if not match.empty:
                    st.session_state.logged_in, st.session_state.user = True, match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("Access Denied!")
else:
    u = st.session_state.user
    role = u['Role']

    # --- SIDEBAR: REAL-TIME CALENDAR & LOGOUT ---
    with st.sidebar:
        now = datetime.now()
        st.markdown(f"""
        <div class="calendar-sidebar">
            <h4 style="color:#FFD700; margin:0;">📅 SYSTEM DATE</h4>
            <h2 style="margin:0; color:white;">{now.strftime("%d %b")}</h2>
            <p style="margin:0; color:#1a73e8;">{now.strftime("%A")}</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Secure Logout"):
            st.session_state.logged_in = False
            st.rerun()

    # --- 6. HOD & COORDINATOR DASHBOARD ---
    if role in ['HOD', 'COORDINATOR', 'Faculty']:
        st.title(f"🛡️ {role} Control Panel")
        
        tabs = st.tabs(["📝 Lecture & Attendance", "📊 Analytics", "⚙️ Faculty Stall"])
        
        with tabs[0]:
            st.header("Record Class Lecture")
            df_students = get_data("STUDENTS LIST!A:Z")
            
            # DATE SELECTOR (Teacher can pick any date)
            c1, c2, c3, c4 = st.columns(4)
            selected_date = c1.date_input("Select Lecture Date", datetime.now())
            selected_slot = c2.selectbox("Lecture Slot", ["1st Slot", "2nd Slot", "3rd Slot", "4th Slot"])
            disc = c3.selectbox("Discipline", df_students['DISCIPLINE'].unique() if not df_students.empty else [])
            batch = c4.selectbox("Batch", df_students['BATCH'].unique() if not df_students.empty else [])
            
            match = df_students[(df_students['BATCH'] == batch) & (df_students['DISCIPLINE'] == disc)]
            semester = match.iloc[0]['SEMESTER'] if not match.empty else "N/A"
            st.warning(f"📍 Marking for: {disc} | {batch} | Semester: {semester}")

            subj = st.text_input("Subject Name")
            topic = st.text_area("Topic Covered / Lesson Plan")

            if not match.empty:
                st.markdown("#### Mark Attendance (Student Name & Father Name)")
                att_records = []
                # Header for the list
                h1, h2, h3 = st.columns([2, 2, 2])
                h1.info("**Student Name**")
                h2.info("**Father Name**")
                h3.info("**Status**")

                for i, r in match.iterrows():
                    col_name, col_fath, col_stat = st.columns([2, 2, 2])
                    col_name.write(f"👤 {r['STUDENT NAME']}")
                    col_fath.write(f"👨 {r['Father Name']}")
                    stat = col_stat.radio("Mark", ["P", "A", "L"], horizontal=True, key=f"att_{i}")
                    att_records.append([r['STUDENT NAME'], r['Father Name'], stat])
                
                if st.button("🚀 SUBMIT RECORD TO CLOUD"):
                    # Record preparation with backdate support
                    final_rows = [[selected_date.strftime("%Y-%m-%d"), datetime.now().strftime("%H:%M:%S"), selected_slot, u['Full Name'], disc, subj, topic, n, f, s, (100 if s=='A' else 0), batch, semester] for n, f, s in att_records]
                    if submit_attendance(final_rows):
                        st.balloons()
                        st.success(f"✅ Record for {selected_date} saved successfully!")

        with tabs[1]:
            st.subheader("Attendance Analytics")
            df_logs = get_data("ATTENDANCE HISTORY!A:R")
            if not df_logs.empty:
                # 75% Alert
                summary = df_logs.groupby('STUDENT NAME').agg({'Status': lambda x: (list(x).count('P')/len(x))*100}).reset_index()
                critical = summary[summary['Status'] < 75]
                for _, r in critical.iterrows():
                    st.markdown(f'<div class="critical-alert">⚠️ {r["STUDENT NAME"]} is below 75% ({r["Status"]:.1f}%)</div>', unsafe_allow_html=True)
                st.dataframe(df_logs.tail(20))

    # --- 7. STUDENT VIEW ---
    elif role == 'Student':
        st.title("👨‍🎓 My Academic History")
        s_name = st.text_input("Enter Student Full Name:")
        if s_name:
            logs = get_data("ATTENDANCE HISTORY!A:R")
            my_res = logs[logs['STUDENT NAME'].str.contains(s_name, case=False, na=False)]
            st.dataframe(my_res[['Date', 'Slot', 'Subject', 'Topic', 'Status']], use_container_width=True)
