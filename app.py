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
    col1, col2, col3 = st.column
