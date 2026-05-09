import streamlit as st
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2 import service_account
import plotly.express as px # Analytics ke liye

# --- CONFIGURATION ---
st.set_page_config(page_title="PIHS Mardan Portal", layout="wide", initial_sidebar_state="expanded")

# Google Sheets Setup
SERVICE_ACCOUNT_INFO = st.secrets["gcp_service_account"]
SHEET_ID = "124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4"

# --- GOOGLE COLAB VIBRANT THEME (CSS) ---
st.markdown("""
    <style>
    /* Main Background */
    .stApp { background-color: #ffffff; }
    
    /* Sidebar Styling */
    section[data-testid="stSidebar"] { background-color: #202124; border-right: 1px solid #3c4043; }
    section[data-testid="stSidebar"] .stMarkdown, section[data-testid="stSidebar"] label { color: #e8eaed !important; }
    
    /* Professional Buttons */
    .stButton>button { 
        width: 100%; border-radius: 4px; background-color: #1a73e8; color: white; 
        font-weight: 500; height: 3em; border: none; transition: 0.3s;
    }
    .stButton>button:hover { background-color: #174ea6; box-shadow: 0 1px 3px rgba(60,64,67,0.3); }
    
    /* Headers */
    h1 { color: #1a73e8; font-family: 'Google Sans',Arial,sans-serif; font-weight: 400; }
    .auth-box { 
        background-color: #ffffff; padding: 40px; border-radius: 8px; 
        box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15); 
        margin-top: 50px; border: 1px solid #dadce0;
    }
    
    /* Tabs & Cards */
    .stTabs [data-baseweb="tab-list"] { gap: 24px; }
    .stTabs [data-baseweb="tab"] { font-weight: 500; color: #5f6368; }
    .stTabs [aria-selected="true"] { color: #1a73e8 !important; border-bottom-color: #1a73e8 !important; }
    </style>
    """, unsafe_allow_html=True)

# --- DATABASE FUNCTIONS ---
def authenticate_sheets():
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return build('sheets', 'v4', credentials=creds)

def get_data(range_name):
    try:
        service = authenticate_sheets()
        result = service.spreadsheets().values().get(spreadsheetId=SHEET_ID, range=range_name).execute()
        values = result.get('values', [])
        if not values: return pd.DataFrame()
        df = pd.DataFrame(values[1:], columns=values[0])
        df.columns = df.columns.str.strip()
        return df
    except Exception as e:
        st.error(f"Database Error: {e}")
        return pd.DataFrame()

def update_cell(cell_range, value):
    service = authenticate_sheets()
    body = {'values': [[value]]}
    service.spreadsheets().values().update(spreadsheetId=SHEET_ID, range=cell_range, valueInputOption="RAW", body=body).execute()

# --- AUTHENTICATION LOGIC ---
if 'auth' not in st.session_state:
    st.session_state.auth = {"logged_in": False, "user": None}

def login_screen():
    st.markdown("<h1 style='text-align: center;'>🎓 PIHS Allied Health Sciences</h1>", unsafe_allow_html=True)
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.markdown("<div class='auth-box'>", unsafe_allow_html=True)
        st.subheader("Login to your Portal")
        user_in = st.text_input("Username")
        pass_in = st.text_input("Password", type="password")
        
        if st.button("Sign In"):
            users = get_data("USERS CREDENTIALS!A:F")
            if not users.empty:
                match = users[(users['Username'].str.strip() == user_in) & (users['Password'].str.strip() == pass_in)]
                if not match.empty:
                    st.session_state.auth = {"logged_in": True, "user": match.iloc[0].to_dict()}
                    st.rerun()
                else:
                    st.error("Invalid Username or Password")
        st.markdown("</div>", unsafe_allow_html=True)

# --- DASHBOARDS ---
def hod_dashboard(user):
    st.title("🛡️ Head of Allied Health Sciences")
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Faculty", "24", "+2")
    col2.metric("Student Strength", "450", "98% Attendance")
    col3.metric("Revenue Status", "608,800", "Updated")
    
    st.markdown("### 📊 Institutional Overview")
    st.info("System is monitoring all departments (Radiology, Dental, Anesthesia, etc.)")

def coordinator_dashboard(user):
    st.title("📋 Coordinator Control Center")
    st.selectbox("Select Department to Monitor", ["Radiology", "MLT", "Dental", "Anesthesia"])
    st.date_input("Check Attendance Date")
    st.button("Generate Daily Report")

def faculty_dashboard(user):
    st.title(f"🎓 Faculty Member: {user['Full Name']}")
    
    # Dynamic Batch/Semester selection from Google Sheets
    st.sidebar.markdown("---")
    batch = st.sidebar.selectbox("Select Batch", ["Batch 3rd", "Batch 5th", "Freshers"])
    semester = st.sidebar.selectbox("Select Semester", ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"])
    
    tab1, tab2 = st.tabs(["Mark Attendance", "Lesson Plans"])
    with tab1:
        st.write(f"Marking attendance for **{batch} - {semester} Semester**")
        st.button("Save Attendance to Google Sheet")

def student_dashboard(user):
    st.title(f"🧑‍🎓 Student Portal: {user['Full Name']}")
    st.write(f"**Department:** {user['Department']}")
    st.progress(85, text="Your Attendance: 85%")
    st.button("Download Date Sheet")

# --- MAIN APP FLOW ---
if not st.session_state.auth["logged_in"]:
    login_screen()
else:
    user_data = st.session_state.auth["user"]
    
    # 1. Force Password Change (If First Login)
    if user_data.get('Is_First_Login') == 'Yes':
        st.warning("🔒 Security Update Required: Change your default password.")
        new_p = st.text_input("New Password", type="password")
        if st.button("Update"):
            # Logic to update row
            users = get_data("USERS CREDENTIALS!A:F")
            row = users[users['Username'] == user_data['Username']].index[0] + 2
            update_cell(f"USERS CREDENTIALS!E{row}", new_p)
            update_cell(f"USERS CREDENTIALS!F{row}", "No")
            st.success("Updated! Login again.")
            st.session_state.auth["logged_in"] = False
            st.rerun()
    else:
        # 2. Main Navigation
        role = user_data['Role']
        st.sidebar.image("https://www.gstatic.com/images/branding/product/2x/avatar_square_blue_120dp.png", width=80)
        st.sidebar.write(f"**{user_data['Full Name']}**")
        st.sidebar.caption(f"{role} | {user_data['Department']}")
        
        if role == "HOD": hod_dashboard(user_data)
        elif role == "Coordinator": coordinator_dashboard(user_data)
        elif role == "Teacher": faculty_dashboard(user_data)
        elif role == "Student": student_dashboard(user_data)
        
        if st.sidebar.button("Logout"):
            st.session_state.auth["logged_in"] = False
            st.rerun()
