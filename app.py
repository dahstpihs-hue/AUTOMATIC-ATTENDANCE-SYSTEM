import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
from datetime import datetime

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Command Center", layout="wide")

SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- ELITE CSS & BLINKING WARNINGS ---
st.markdown("""
    <style>
    .main { background-color: #0d1b2a; color: white; }
    @keyframes blinker { 50% { opacity: 0; } }
    .blinking-text {
        font-family: 'Arial Black'; font-size: 30px; color: #FFD700;
        animation: blinker 1.5s linear infinite; text-align: center;
    }
    .critical-alert {
        color: #ff4b4b; font-weight: bold; animation: blinker 1s linear infinite;
        background-color: rgba(255, 75, 75, 0.1); padding: 10px; border-radius: 5px;
    }
    .stats-card {
        background-color: #1b263b; padding: 20px; border-radius: 15px;
        border-top: 4px solid #FFD700; text-align: center;
    }
    .gateway-master { 
        background-color: #001d3d; padding: 20px; border-radius: 20px; 
        border: 2px solid #FFD700; text-align: center; margin-bottom: 20px;
    }
    </style>
    """, unsafe_allow_html=True)

# --- 2. BACKEND ENGINES ---
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

# --- 3. HEADER ---
st.markdown('<div class="gateway-master"><div class="blinking-text">WELCOME TO THE</div><h1 style="color:white;">DEPARTMENT OF ALLIED HEALTH SCIENCES</h1><p style="color:#FFD700;">THE PROFESSIONAL INSTITUTE OF HEALTH SCIENCES MARDAN</p></div>', unsafe_allow_html=True)

# --- 4. DASHBOARD LOGIC (HOD & COORDINATOR) ---
if 'logged_in' in st.session_state and st.session_state.logged_in:
    u = st.session_state.user
    role = u['Role']

    if role in ['HOD', 'COORDINATOR']:
        st.title("📊 Institutional Analytics & Warning System")
        
        df_stu = get_data("STUDENTS LIST!A:Z")
        df_att = get_data("ATTENDANCE HISTORY!A:R")

        if not df_att.empty:
            # --- OVERALL PERCENTAGE CALCULATION ---
            # Har student ki total classes aur presents nikalna
            attendance_summary = df_att.groupby('STUDENT NAME').agg({
                'Status': lambda x: (list(x).count('P') / len(x)) * 100
            }).reset_index()
            attendance_summary.columns = ['Student Name', 'Percentage']

            # --- SUBJECT-WISE PERCENTAGE ---
            subject_summary = df_att.groupby(['STUDENT NAME', 'Subject']).agg({
                'Status': lambda x: (list(x).count('P') / len(x)) * 100
            }).reset_index()
            subject_summary.columns = ['Student Name', 'Subject', 'Subject %']

            # --- 5. CRITICAL WARNING PANEL (Blinking) ---
            st.subheader("🚨 Critical Attendance Warnings (Below 75%)")
            low_attendance = attendance_summary[attendance_summary['Percentage'] < 75]
            
            if not low_attendance.empty:
                for idx, row in low_attendance.iterrows():
                    name = row['Student Name']
                    perc = row['Percentage']
                    
                    # Blinking warning for overall attendance
                    st.markdown(f"""
                        <div class="critical-alert">
                            ⚠️ WARNING: {name} has {perc:.1f}% Overall Attendance!
                        </div>
                    """, unsafe_allow_html=True)
                    
                    # Specific subject warnings for this student
                    sub_low = subject_summary[(subject_summary['Student Name'] == name) & (subject_summary['Subject %'] < 75)]
                    if not sub_low.empty:
                        with st.expander(f"View Subject Details for {name}"):
                            for _, sub_row in sub_low.iterrows():
                                st.write(f"❌ {sub_row['Subject']}: {sub_row['Subject %']:.1f}%")
                st.markdown("---")
            else:
                st.success("✅ All students are above 75% overall.")

        # Summary Cards (As before)
        c1, c2 = st.columns(2)
        c1.metric("Total RAD Students", len(df_stu[df_stu['DISCIPLINE'] == 'RADIOLOGY']))
        c2.metric("Total MLT Students", len(df_stu[df_stu['DISCIPLINE'] == 'MLT']))

    # --- 6. STUDENT VIEW (As before) ---
    if role == 'Student':
        st.title("👨‍🎓 My Detailed Attendance Report")
        # Student specific search and 75% check
