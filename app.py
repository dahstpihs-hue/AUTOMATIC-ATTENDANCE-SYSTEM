import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan System", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- 2. ELITE CSS (Blinking & Professional Layout) ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black'; font-size: 32px; color: #FFD700;
        animation: blinker 1.5s linear infinite; text-align: center;
    }
    .critical-alert {
        color: #ff4b4b; font-weight: bold; animation: blinker 1s linear infinite;
        background-color: rgba(255, 75, 75, 0.1); padding: 10px; border-radius: 8px; border: 1px solid red;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 25px; border-radius: 20px; 
        border: 2px solid #FFD700; text-align: center; margin-bottom: 20px;
    }
    .stButton>button { width: 100%; border-radius: 12px; height: 3.5em; font-weight: bold; background-color: #28a745; color: white; }
    </style>
    """, unsafe_allow_html=True)

# --- 3. BACKEND ENGINES (With Column Cleaning) ---
def get_service():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = get_service()
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        
        # Header Cleaning Logic: KeyError se bachne ke liye
        df = pd.DataFrame(values[1:], columns=values[0])
        df.columns = df.columns.str.strip() # Extra spaces khatam
        return df
    except Exception as e:
        st.error(f"Database Error: {e}")
        return pd.DataFrame()

# --- 4. HEADER ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

st.markdown("""
<div class="gateway-master">
    <div class="blinking-text">WELCOME TO THE</div>
    <h1 style="color:white; font-size:24px;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1>
    <p style="color:#FFD700; font-size:18px; font-weight:bold;">AUTOMATIC ATTENDANCE TRACKING SYSTEM</p>
</div>
""", unsafe_allow_html=True)

# --- 5. AUTHENTICATION LOGIC (The Fixed Part) ---
if not st.session_state.logged_in:
    users_df = get_data("USERS_CREDENTIALS!A:F")
    
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.markdown("### 🔒 SYSTEM ACCESS")
        role = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'Faculty', 'Student'])
        
        if role in ['HOD', 'COORDINATOR', 'Faculty']:
            if not users_df.empty:
                # Filter name list for Faculty, but check if 'Full Name' exists
                if 'Full Name' in users_df.columns:
                    name_list = users_df[users_df['Role'] == role]['Full Name'].tolist() if role == 'Faculty' else [role]
                    user_sel = st.selectbox("YOUR NAME:", name_list) if role == 'Faculty' else role
                    pwd = st.text_input("PASSWORD", type="password")
                    
                    if st.button("ENTER PORTAL"):
                        # Critical Check: Ensuring 'Role' and 'Password' columns exist
                        if 'Role' in users_df.columns and 'Password' in users_df.columns:
                            if role == 'Faculty':
                                match = users_df[(users_df['Full Name'] == user_sel) & (users_df['Password'] == pwd)]
                            else:
                                match = users_df[(users_df['Role'] == role) & (users_df['Password'] == pwd)]
                            
                            if not match.empty:
                                st.session_state.logged_in = True
                                st.session_state.user = match.iloc[0].to_dict()
                                st.balloons()
                                st.rerun()
                            else:
                                st.error("❌ Incorrect Password or Name")
                        else:
                            st.error("❌ Error: 'Role' or 'Password' column not found in Google Sheet!")
                else:
                    st.error("❌ Error: 'Full Name' column missing in Sheet!")
            else:
                st.info("🔄 Connecting to Database... Please wait.")
        
        elif role == 'Student':
            if st.button("PROCEED TO STUDENT DASHBOARD"):
                st.session_state.logged_in = True
                st.session_state.user = {'Role': 'Student', 'Full Name': 'Student Access'}
                st.rerun()

# --- 6. DASHBOARDS ---
else:
    user = st.session_state.user
    role = user.get('Role', 'Student')
    st.sidebar.success(f"User: {user['Full Name']}")
    
    st.title(f"🛡️ {role} Dashboard")
    
    if role in ['HOD', 'COORDINATOR', 'Faculty']:
        tabs = st.tabs(["📊 Analytics & Warning", "📝 Mark Attendance", "👥 Staff Stall"])
        
        with tabs[0]:
            st.markdown("### ⚡ Real-Time Departmental Status")
            # 75% Warning and Stats Logic...
            
    if st.sidebar.button("Logout"):
        st.session_state.logged_in = False
        st.rerun()
