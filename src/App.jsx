import React from "react";
import { AuthProvider,  } from "./context/AuthContext";
// import { supabase } from "./utils/supabaseClient";  // ✅ Import Supabase
import LoginForm from "./components/LoginForm/LoginForm";
import Map from "./components/Map/Map";
import "./App.css";
function App() {
  return (
  <div>
    <Map/>
  </div>
  );
}

// const AuthContent = () => {
//   const { user } = useAuth();

//   return (
//     <div>
//       {user ? (
//         <div className="app-container">
//           <button className="logout-button" onClick={() => supabase.auth.signOut()}>Logout</button>
//           <Map />
//         </div>
//       ) : (
//         <LoginForm />
//       )}
//     </div>
//   );
// };

export default App;