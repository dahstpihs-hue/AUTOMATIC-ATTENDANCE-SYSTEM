import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Command Center", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- 2. ELITE CSS (Blinking, Glow & Cards) ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black'; font-size: 32px; color: #FFD700;
        animation: blinker 1.5s linear infinite; text-align: center; margin-bottom: 5px;
    }
    .critical-alert {
        color: #ff4b4b; font-weight: bold; animation: blinker 1s linear infinite;
        background-color: rgba(255, 75, 75, 0.1); padding: 10px; border-radius: 8px; border: 1px solid red;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 20px; border-radius: 20px; 
        border: 2px solid #FFD700; text-align: center; margin-bottom: 20px;
    }
    .stButton>button { width: 100%; border-radius: 12px; height: 3.5em; font-weight: bold; background-color: #28a745; color: white; }
    </style>
    """, unsafe_allow_html=True)

# --- 3. BACKEND CORE FUNCTIONS ---
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

def write_data(range_name, values, action="append"):
    service = get_service()
    if action == "append":
        service.spreadsheets().values().append(spreadsheetId=SHEET_ID, range=range_name, valueInputOption="RAW", body={'values': values}).execute()
    else:
        service.spreadsheets().values().update(spreadsheetId=SHEET_ID, range=range_name, valueInputOption="RAW", body={'values': values}).execute()

# --- 4. GLOBAL HEADER ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.balloons()

st.markdown('<div class="gateway-master"><div class="blinking-text">WELCOME TO THE</div><h1 style="color:white; font-size:26px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1><p style="color:#FFD700;">PIHS MARDAN PORTAL</p></div>', unsafe_allow_html=True)

# --- 5. AUTHENTICATION LOGIC ---
if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        role = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty', 'Student'])
        
        if role in ['HOD', 'COORDINATOR', 'Faculty']:
            name_list = users_df[users_df['Role'] == role]['Full Name'].tolist() if role == 'Faculty' else [role]
            user_sel = st.selectbox("NAME:", name_list) if role == 'Faculty' else role
            pwd = st.text_input("PASSWORD", type="password")
            if st.button("LOGIN TO DASHBOARD"):
                match = users_df[(users_df['Full Name'] == user_sel) & (users_df['Password'] == pwd)] if role == 'Faculty' else users_df[(users_df['Role'] == role) & (users_df['Password'] == pwd)]
                if not match.empty:
                    st.session_state.logged_in, st.session_state.user = True, match.iloc[0].to_dict()
                    st.rerun()
                else: st.error("❌ Access Denied")
        
        elif role == 'Student':
            if st.button("OPEN STUDENT PORTAL (NO PASSWORD)"):
                st.session_state.logged_in, st.session_state.user = True, {'Role': 'Student', 'Full Name': 'Student Portal'}
                st.rerun()

# --- 6. DASHBOARDS ---
else:
    u = st.session_state.user
    role = u['Role']
    st.sidebar.markdown(f"### 📍 Welcome\n**{u['Full Name']}**")

    # --- HOD & COORDINATOR COMMAND CENTER ---
    if role in ['HOD', 'COORDINATOR']:
        tabs = st.tabs(["📊 Live Analytics", "📝 Mark Attendance", "👥 Manage Faculty"])
        
        with tabs[0]: # Analytics & Warning
            df_att = get_data("ATTENDANCE HISTORY!A:R")
            if not df_att.empty:
                # 75% Warning Logic
                summary = df_att.groupby('STUDENT NAME').agg({'Status': lambda x: (list(x).count('P')/len(x))*100}).reset_index()
                critical = summary[summary['Status'] < 75]
                if not critical.empty:
                    st.markdown("### 🚨 CRITICAL WARNING (Below 75%)")
                    for _, r in critical.iterrows():
                        st.markdown(f'<div class="critical-alert">⚠️ {r["STUDENT NAME"]}: {r["Status"]:.1f}% Attendance</div>', unsafe_allow_html=True)
                
            st.markdown("---")
            st.subheader("Today's Departmental Summary")
            # Batch-wise count logic yahan show hogi

        with tabs[1]: # HOD/Coord as Subject Teachers
            st.header("📋 Subject Teacher Mode")
            # Same attendance marking UI as faculty
            st.info("Marking attendance for your assigned class...")

        if role == 'HOD':
            with tabs[2]: # Manage Faculty (ONLY HOD)
                st.header("👤 Faculty Stall (Add/Remove)")
                with st.form("new_teacher"):
                    fn, dep = st.text_input("Teacher Name"), st.selectbox("Department", ["RADIOLOGY", "MLT", "DENTAL"])
                    if st.form_submit_button("Register Faculty"):
                        write_data("USERS_CREDENTIALS!A:F", [[fn, fn.lower().replace(" ","."), dep, "Faculty", "tpihs123", "TRUE"]])
                        st.success(f"✅ {fn} added to database!")

    # --- FACULTY DASHBOARD ---
    elif role == 'Faculty':
        st.header("🎓 Faculty Subject Portal")
        # Attendance Marking UI (Batch/Disc/Semester select) yahan show hoga

    # --- STUDENT DASHBOARD ---
    elif role == 'Student':
        st.header("👨‍🎓 My Semester Progress Report")
        st.info("View your date-wise history and overall percentage.")
        name_in = st.text_input("Enter Your Full Name:")
        if name_in:
            logs = get_data("ATTENDANCE HISTORY!A:R")
            res = logs[logs['STUDENT NAME'].str.contains(name_in, case=False, na=False)]
            st.dataframe(res[['Date', 'Faculty Name', 'Subject', 'Topic', 'Status']], use_container_width=True)

    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
