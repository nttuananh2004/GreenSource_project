# GreenSource: Web-Based Decision Support System for Supplier Selection

GreenSource is a specialized Decision Support System (DSS) developed to assist supply chain managers in evaluating and selecting providers through the TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) multi-criteria decision-making algorithm.

## Group 18 Information
- **Nguyen Tran Tuan Anh** (10422005)
- **Nguyen Tien Khoa** (10422035)
- **Ta Le Khoi Vi** (10422083)

## Deployment and Live Demo
- **Live Application:** https://greensource-project.onrender.com/
- **Administrator Credentials:** Username: `admin` | Password: `admin123`

## Technical Constraints and Initialization
This application is hosted on the OnRender Free Tier, which imposes specific infrastructure behaviors:
1. **Server Cold Start:** The instance may spin down after 15 minutes of inactivity. If the URL does not resolve immediately, please allow approximately 60 seconds for the service to re-initialize.
2. **Data Volatility:** The system utilizes an ephemeral file system. Consequently, the SQLite database resets periodically upon server restart.
3. **Testing Protocol:** To evaluate the system functionality, the evaluator must:
   - Log in as Admin to access the "Input Data from Provider" dashboard.
   - Manually populate the database with supplier data (refer to the attached Excel sample).
   - Navigate to the "Optimization Engine" to execute the TOPSIS ranking and resource allocation.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Modern UI with responsive charts)
