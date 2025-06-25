// src/components/UserInfo.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

export default function UserInfo() {
  const { getToken } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const token = await getToken({ template: "default" });
        const res = await fetch("http://localhost:4000/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setUserId(data.userId);
      } catch (err) {
        console.error("❌ Kon gebruiker niet ophalen:", err);
      }
    }

    fetchUser();
  }, [getToken]);

  return (
    <div>
      {userId ? (
        <p>
          ✅ Ingelogd als: <code>{userId}</code>
        </p>
      ) : (
        <p>🔒 Niet ingelogd</p>
      )}
    </div>
  );
}
