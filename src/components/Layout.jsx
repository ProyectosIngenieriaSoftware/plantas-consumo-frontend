import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles/layout.css";

function Layout() {
    const [colapsado, setColapsado] = useState(false);

    return (
        <div className="app">
            <Sidebar
                colapsado={colapsado}
                setColapsado={setColapsado}
            />

            <div className={`app-content ${colapsado ? "app-content-mini" : ""}`}>
                <Header />

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;