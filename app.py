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
        background-color: #001d3d; padding: 25px; border-radius: 20px; 
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
        
        # --- CRITICAL FIX: Clean Headers ---
        headers = [str(h).strip().title() for h in values[0]] # Strips spaces and makes it Title Case
        df = pd.DataFrame(values[1:], columns=headers)
        return df
    except Exception as e:
        st.error(f"Database Error: {e}")
        return pd.DataFrame()

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
        
        if not users_df.empty:
            if role in ['HOD', 'COORDINATOR', 'Faculty']:
                # Role check to find names
                if role == 'Faculty':
                    f_names = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
                    user_sel = st.selectbox("Select Your Name:", f_names)
                else: 
                    user_sel = role
                
                pwd = st.text_input("PASSWORD", type="password")
                if st.button("ENTER PORTAL"):
                    # Double check logic for HOD/Coordinator/Faculty
                    if role == 'Faculty':
                        match = users_df[(users_df['Full Name'] == user_sel) & (users_df['Password'] == pwd)]
                    else:
                        match = users_df[(users_df['Role'] == role) & (users_df['Password'] == pwd)]
                        
                    if not match.empty:
                        st.session_state.logged_in, st.session_state.user = True, match.iloc[0].to_dict()
                        st.rerun()
                    else: st.error("Access Denied: Wrong Password or Role")
            
            elif role == 'Student':
                if st.button("PROCEED TO STUDENT DASHBOARD"):
                    st.session_state.logged_in, st.session_state.user = True, {'Role': 'Student', 'Full Name': 'Guest'}
                    st.rerun()
        else:
            st.warning("⚠️ Waiting for Database Connection...")

else:
    # (Dashboard Content Starts Here)
    u = st.session_state.user
    role = u.get('Role', 'Student')
    
    with st.sidebar:
        now = datetime.now()
        st.markdown(f'<div class="calendar-sidebar"><h4 style="color:#FFD700; margin:0;">📅 SYSTEM DATE</h4><h2 style="margin:0; color:white;">{now.strftime("%d %b")}</h2><p style="margin:0; color:#1a73e8;">{now.strftime("%A")}</p></div>', unsafe_allow_html=True)
        if st.sidebar.button("Logout"):
            st.session_state.logged_in = False
            st.rerun()

    st.title(f"🛡️ {role} Dashboard")
    
    # --- MARK ATTENDANCE PORTAL (For HOD/COORD/FACULTY) ---
    if role in ['HOD', 'COORDINATOR', 'Faculty']:
        df_students = get_data("STUDENTS LIST!A:Z")
        
        with st.expander("📝 Mark Class Attendance / Lecture Record", expanded=True):
            c1, c2, c3 = st.columns(3)
            selected_date = c1.date_input("Lecture Date", datetime.now())
            selected_slot = c2.selectbox("Slot", ["1st Slot", "2nd Slot", "3rd Slot", "4th Slot"])
            
            # Filtering Students
            disc = st.selectbox("Discipline", df_students['Discipline'].unique() if not df_students.empty else [])
            batch = st.selectbox("Batch", df_students['Batch'].unique() if not df_students.empty else [])
            
            match = df_students[(df_students['Batch'] == batch) & (df_students['Discipline'] == disc)]
            
            subj = st.text_input("Subject")
            topic = st.text_area("Topic")
            
            if not match.empty:
                st.markdown("---")
                att_data = []
                for i, r in match.iterrows():
                    col1, col2, col3 = st.columns([2, 2, 2])
                    col1.write(f"👤 {r['Student Name']}")
                    col2.write(f"👨 {r['Father Name']}")
                    stat = col3.radio("Status", ["P", "A", "L"], horizontal=True, key=f"att_{i}")
                    att_data.append([r['Student Name'], r['Father Name'], stat])
                
                if st.button("SUBMIT TO CLOUD"):
                    # Backend update
                    rows = [[selected_date.strftime("%Y-%m-%d"), datetime.now().strftime("%H:%M:%S"), selected_slot, u['Full Name'], disc, subj, topic, n, f, s, (100 if s=='A' else 0), batch, "Semester"] for n, f, s in att_data]
                    if submit_attendance(rows):
                        st.balloons()
                        st.success("✅ Data Recorded!")
