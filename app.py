# --- AUTHENTICATION LOGIC ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False

if not st.session_state.logged_in:
    # Space wale naam ke saath data call (Single quotes are important)
    users_df = get_data("'USERS CREDENTIALS'!A:F")
    
    cols = st.columns([1, 1.5, 1])
    with cols[1]:
        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("🔒 SECURE GATEWAY ACCESS")
        role_selection = st.selectbox("LOGIN AS:", ['-- SELECT ROLE --', 'HOD', 'COORDINATOR', 'FACULTY MEMBER', 'STUDENT'])
        
        if role_selection in ['HOD', 'COORDINATOR']:
            pass_input = st.text_input("ENTER SYSTEM PASSWORD", type="password")
            if st.button("AUTHORIZE & ENTER"):
                if not users_df.empty:
                    # Logic Fix: Cleaning data before matching
                    users_df['Role'] = users_df['Role'].astype(str).str.strip()
                    users_df['Password'] = users_df['Password'].astype(str).str.strip()
                    
                    # HOD login match
                    match = users_df[(users_df['Role'] == role_selection) & (users_df['Password'] == pass_input.strip())]
                    
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user_data = match.iloc[0].to_dict()
                        st.rerun()
                    else:
                        st.error("❌ Incorrect Password! Please check your credentials.")
                else:
                    st.error("⚠️ Database is empty or not connected.")

        elif role_selection == 'FACULTY MEMBER':
            if not users_df.empty:
                # Cleaning roles to find 'Faculty'
                users_df['Role'] = users_df['Role'].astype(str).str.strip()
                faculty_list = users_df[users_df['Role'] == 'Faculty']['Full Name'].tolist()
                
                selected_faculty = st.selectbox("SELECT YOUR NAME:", faculty_list)
                f_pass_input = st.text_input("PASSWORD", type="password")
                
                if st.button("VERIFY FACULTY"):
                    users_df['Full Name'] = users_df['Full Name'].astype(str).str.strip()
                    users_df['Password'] = users_df['Password'].astype(str).str.strip()
                    
                    match = users_df[(users_df['Full Name'] == selected_faculty) & (users_df['Password'] == f_pass_input.strip())]
                    if not match.empty:
                        st.session_state.logged_in = True
                        st.session_state.user_data = match.iloc[0].to_dict()
                        st.rerun()
                    else: st.error("❌ Incorrect Credentials")
