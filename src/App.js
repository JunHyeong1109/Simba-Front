import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReviewerPage from "./pages/ReviewerPage";
import Review from "./pages/Review";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/ReviewerPage" element={<ReviewerPage />} />
        <Route path="/Review" element={<Review />} />
      </Routes>
    </Router>
  );
}

export default App;
