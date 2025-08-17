import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReviewerPage from "./pages/ReviewerPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/ReviewerPage" element={<ReviewerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
