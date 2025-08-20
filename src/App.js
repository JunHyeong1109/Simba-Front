// // import logo from './logo.svg';
// // import './App.css';
// // import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// // import Login from "./pages/Login";
// // import Signup from "./pages/Signup";

// // function App() {
// //   return (
// //     <div className="App">
// //       {/* <header className="App-header"> */}
// //         {/* <img src={logo} className="App-logo" alt="logo" />
// //         <p>
// //           Edit <code>src/App.js</code> and save to reload.
// //         </p>
// //         <a
// //           className="App-link"
// //           href="https://reactjs.org"
// //           target="_blank"
// //           rel="noopener noreferrer"
// //         >
// //           Learn React
// //         </a> */}
// //         <div className='content'>
// //         <Routes>
// //           <Route path='' element={<Login />} />
// //           <Route path='/Signup' element={<Signup />} />
// //         </Routes>
// //       </div>
// //       {/* </header> */}
// //     </div>
// //   );
// // }

// // export default App;
// import './App.css';
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Login from "./pages/login";
// import Signup from "./pages/signup";

// function App() {
//   return (
//     <div className="App">
//       <Router>
//         <div className='content'>
//           <Routes>
//             <Route path='/login' element={<Login />} />
//             <Route path='/signup' element={<Signup />}/> 
//           </Routes>
//         </div>
//       </Router>
//     </div>
//   );
// }

// export default App;
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Main from "./pages/Main";
import OwnerPage from "./pages/OwnerPage";
import StoreRegister from "./pages/StoreRegister";
import ReviewEvent from "./pages/ReviewEvent";
import ReviewCheck from "./pages/ReviewCheck";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/main" element={<Main />} />
        <Route path="/owner" element={<OwnerPage />} />
        <Route path="/store-register" element={<StoreRegister />} />
        <Route path="/review-event" element={<ReviewEvent />} />
        <Route path="/review-check" element={<ReviewCheck />} />
      </Routes>
    </Router>
  );
}

export default App;
