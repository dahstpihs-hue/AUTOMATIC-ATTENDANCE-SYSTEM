import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# Colab-Style Professional UI
st.markdown("""
    <style>
    .main { background-color: #f8f9fa; }
    .stButton>button { width: 100%; border-radius: 8px; background-color: #1a73e8; color: white; font-weight: bold; height: 3em; }
    h1 { color: #1a73e8; text-align: center; font-family: 'Segoe UI'; margin-bottom: 0px;}
    .auth-box { background-color: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); margin-top: 20px;}
    .sidebar .sidebar-content { background-color: #2c3e50; }
    </style>
    """, unsafe_allow_html=True)

def authenticate_sheets():
    try:
        creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
        return build('sheets', 'v4', credentials=creds)
    except Exception as e:
        st.error(f"Authentication Problem: {e}")
        return None

def get_sheet_data(range_name):
    service = authenticate_sheets()
    if service:
        try:
            result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
            values = result.get('values', [])
            if values:
                df = pd.DataFrame(values[1:], columns=values[0])
                # Cleaning column names (Removing spaces)
                df.columns = df.columns.str.strip()
                return df
        except Exception as e:
            st.error(f"Data Fetching Error: {e}")
    return pd.DataFrame()

def update_sheet_cell(cell_range, new_value):
    service = authenticate_sheets()
    body = {'values': [[new_value]]}
    service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID, range=cell_range,
        valueInputOption="RAW", body=body).execute()

# --- SESSION STATE ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.user_data = None

# --- LOGIN SCREEN ---
def show_login():
    st.markdown("<h1>🎓 ALLIED HEALTH SCIENCES PORTAL</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: gray;'>THE PROFESSIONALS INSTITUTE OF HEALTH SCIENCES, MARDAN</p>", unsafe_allow_html=True)
    
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.markdown("<div class='auth-box'>", unsafe_allow_html=True)
        u_input = st.text_input("👤 Username").strip()
        p_input = st.text_input("🔑 Password", type="password").strip()
        
        if st.button("Secure Login"):
            users_df = get_sheet_data("USERS CREDENTIALS!A:F")
            
            if not users_df.empty:
                # Matching with your specific columns
                match = users_df[(users_df['Username'].astype(str).str.strip() == u_input) & 
                                 (users_df['Password'].astype(str).str.strip() == p_input)]
                
                if not match.empty:
                    st.session_state.logged_in = True
                    st.session_state.user_data = match.iloc[0].to_dict()
                    st.rerun()
                else:
                    st.error("❌ Username ya Password ghalat hai!")
            else:
                st.error("⚠️ Sheet connect nahi ho rahi ya khali hai.")
        st.markdown("</div>", unsafe_allow_html=True)

# --- APP MAIN LOGIC ---
if not st.session_state.logged_in:
    show_login()
else:
    user = st.session_state.user_data
    
    # --- FIRST LOGIN PASSWORD CHANGE LOGIC ---
    # Agar 'Is_First_Login' Column mein 'Yes' likha hai
    if user.get('Is_First_Login') == 'Yes' or user.get('Password') == '12345':
        st.warning(f"👋 Khush Amdeed {user['Full Name']}! Pehli baar login par apna password tabdeel karein.")
        new_pass = st.text_input("Naya Password Likhein", type="password")
        confirm_pass = st.text_input("Dobara Likhein", type="password")
        
        if st.button("Update Password"):
            if new_pass == confirm_pass and len(new_pass) > 4:
                # Sheet mein password aur First Login status update karna
                users_df = get_sheet_data("USERS CREDENTIALS!A:F")
                row_idx = users_df[users_df['Username'] == user['Username']].index[0] + 2
                
                # Update Password (Column E) aur Is_First_Login (Column F)
                update_sheet_cell(f"USERS CREDENTIALS!E{row_idx}", new_pass)
                update_sheet_cell(f"USERS CREDENTIALS!F{row_idx}", "No")
                
                st.success("✅ Password update ho gaya! Ab dobara login karein.")
                st.session_state.logged_in = False
                st.rerun()
            else:
                st.error("Passwords match nahi kar rahe ya bohat chotay hain!")
    
    else:
        # --- DASHBOARD NAVIGATION ---
        st.sidebar.title(f"📍 {user['Full Name']}")
        st.sidebar.info(f"Role: {user['Role']}\nDept: {user['Department']}")
        
        role = user['Role']
        
        if role == "HOD" or user['Username'] == "admin":
            st.title("🛡️ HOD & Full Control Dashboard")
            menu = ["Institute Overview", "Faculty Monitoring", "Attendance Reports", "Student Database", "Department Management"]
        elif role == "Teacher":
            st.title("🎓 Faculty Learning Management")
            menu = ["Mark Attendance", "My Lecture Records", "Student List", "Leave Application"]
        elif role == "Coordinator":
            st.title("📋 Coordination & Monitoring")
            menu = ["Daily Attendance Summary", "Exam Schedules", "Faculty Attendance"]
        else:
            st.title("🧑‍🎓 Student Portal")
            menu = ["My Attendance history", "Lecture Slides", "Internal Marks"]

        choice = st.sidebar.radio("Main Menu", menu)
        st.divider()
        st.write(f"Aap abhi **{choice}** section par kaam kar rahe hain.")
        
        if st.sidebar.button("🚪 Logout"):
            st.session_state.logged_in = False
            st.rerun()
