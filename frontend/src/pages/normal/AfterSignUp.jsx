import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { useUser } from "@clerk/clerk-react";

const AfterSignUp = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    const addAccount = async () => {
      const role = localStorage.getItem("roleForNewAccount");

      try {
        const res = await axios.post('http://localhost:3000/api/auth/signup', {
          clerk_user_id: user?.id,
          name: user?.fullName,
          email: user?.emailAddresses[0].emailAddress,
          role
        });
        if (res.status == 201)
          navigate(`/${role}s`);
      } catch (error) {
        console.error("Error adding account:", error);
      }
    };

    addAccount();
  }, [user]);

  return (
    <div>AfterSignUp</div>
  )
}

export default AfterSignUp