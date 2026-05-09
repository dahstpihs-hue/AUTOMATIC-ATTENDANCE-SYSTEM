import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Portal", layout="wide")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "https://docs.google.com/spreadsheets/d/124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4/edit?gid=674862834#gid=674862834" # Apni Sheet ID yahan likhein

# CSS for Beautiful UI (Colab Style)
st.markdown("""
    <style>
    .main { background-color: #f8f9fa; }
    .stButton>button { width: 100%; border-radius: 5px; background-color: #4285f4; color: white; }
    .sidebar .sidebar-content { background-image: linear-gradient(#2c3e50,#000000); color: white; }
    h1 { color: #1a73e8; font-family: 'Segoe UI'; }
    .stMetric { background-color: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
    """, unsafe_allow_html=True)

# Authentication Function
def authenticate_sheets():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_sheet_data(range_name):
    service = authenticate_sheets()
    result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
    values = result.get('values', [])
    return pd.DataFrame(values[1:], columns=values[0]) if values else pd.DataFrame()

def update_password_in_sheet(username, new_password):
    service = authenticate_sheets()
    df = get_sheet_data("USERS_CREDENTIALS!A:C")
    # Yahan hum row index dhoond kar password update karenge
    row_idx = df[df['Username'] == username].index[0] + 2 # +2 because of header and 0-indexing
    body = {'values': [[new_password]]}
    service.spreadsheets().values().update(
        spreadsheetId=SHEET_ID, range=f"USERS_CREDENTIALS!B{row_idx}",
        valueInputOption="RAW", body=body).execute()

# --- LOGIN LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

def show_login():
    st.title("🎓 WELCOME TO THE DEPARTMENT OF ALLIED HEALTH SCIENCES")
    st.subheader("Authorized Access Only")
    
    with st.form("login_form"):
        u = st.text_input("👤 Username")
        p = st.text_input("🔑 Password", type="password")
        submit = st.form_submit_button("Login")
        
        if submit:
            users_df = get_sheet_data("USERS_CREDENTIALS!A:C")
            user_row = users_df[users_df['Username'] == u]
            
            if not user_row.empty and user_row.iloc[0]['Password'] == p:
                st.session_state.logged_in = True
                st.session_state.user = u
                st.session_state.role = user_row.iloc[0]['Role'] # HOD, Teacher, etc.
                st.rerun()
            else:
                st.error("Ghalat ID ya Password!")

# --- MAIN APP ---
if not st.session_state.logged_in:
    show_login()
else:
    # First Time Password Change Check
    if "12345" in get_sheet_data(f"USERS_CREDENTIALS!A:C").query(f"Username == '{st.session_state.user}'")['Password'].values:
        st.warning("⚠️ Security Alert: Baraye meharbani apna password tabdeel karein!")
        new_p = st.text_input("Naya Password Likhein", type="password")
        if st.button("Password Update Karein"):
            update_password_in_sheet(st.session_state.user, new_p)
            st.success("Password badal gaya! Ab dobara login karein.")
            st.session_state.logged_in = False
            st.rerun()
    else:
        # Dashboard based on Role
        st.sidebar.title(f"Welcome, {st.session_state.user}")
        role = st.session_state.role
        
        if role == "HOD" or st.session_state.user == "admin":
            st.header("🛡️ HOD DASHBOARD")
            menu = ["Overview", "Faculty Monitoring", "Student Analytics", "Manage Users"]
        elif role == "Teacher":
            st.header("🎓 FACULTY PORTAL")
            menu = ["Mark Attendance", "Lecture Records", "Student List"]
        elif role == "Coordinator":
            st.header("📋 COORDINATOR PANEL")
            menu = ["Attendance History", "Exam Records"]
        else:
            st.header("🧑‍🎓 STUDENT PORTAL")
            menu = ["My Attendance", "Datesheet"]

        choice = st.sidebar.radio("Navigation", menu)
        st.write(f"Aap abhi **{choice}** section mein hain.")
