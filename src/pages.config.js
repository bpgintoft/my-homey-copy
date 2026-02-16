/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Appliances from './pages/Appliances';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Family from './pages/Family';
import History from './pages/History';
import Home from './pages/Home';
import HomeDetails from './pages/HomeDetails';
import House from './pages/House';
import Kids from './pages/Kids';
import Maintenance from './pages/Maintenance';
import MaintenanceCalendar from './pages/MaintenanceCalendar';
import Meals from './pages/Meals';
import RoomDetail from './pages/RoomDetail';
import Rooms from './pages/Rooms';
import Vendors from './pages/Vendors';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Appliances": Appliances,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "Family": Family,
    "History": History,
    "Home": Home,
    "HomeDetails": HomeDetails,
    "House": House,
    "Kids": Kids,
    "Maintenance": Maintenance,
    "MaintenanceCalendar": MaintenanceCalendar,
    "Meals": Meals,
    "RoomDetail": RoomDetail,
    "Rooms": Rooms,
    "Vendors": Vendors,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};