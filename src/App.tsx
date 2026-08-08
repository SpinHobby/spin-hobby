import { useEffect } from "react";
import "./sass/main.scss";
import "react-phone-number-input/style.css";
import Modal from "view/modal";
import { useDispatch } from "react-redux";
import useAuthInit from "./hooks/useAuthInit";
// import { openModal } from "reducers";
// import { EModal } from "ts";
//import { BrowserRouter } from "react-router-dom";
//import NavBar from "./view/components/NavBar";
//import Footer from "./view/components/Footer";
//import Modal from "./view/components/Modal";
//import Home from "./view/pages/Home";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import NavBar from "./view/components/NavBar";
import NavBarV2 from "./view/components/NavBarV2";
import Footer from "./view/components/Footer";
// import Modal from "./view/components/Modal";
import Home from "./view/pages/Home";
import Cart from "./view/pages/Cart";
import CheckOut from "./view/pages/CheckOut";
import Search from "./view/pages/Search";
import Product from "view/pages/Product";
import ProductDetail from "view/pages/ProductDetail";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import Login from "view/pages/Login";
import { useBetaSelector } from "./selectors";
import { Account } from "view/pages/Account";
import AdminDashboard from "view/pages/Admin";
import CheckoutSuccess from "view/pages/CheckoutSuccess";
import SquareCallback from "view/pages/Auth/SquareCallback";
import SquareWeb from "view/pages/SquareWeb";
import Contact from "view/pages/Contact";
import Support from "view/pages/Support";
import Events from "view/pages/Events";
import About from "view/pages/About";
import NotFound from "view/pages/NotFound";
import Cashier from "view/pages/Cashier";

let loaded = false;

function App() {
  const beta = useBetaSelector();
  const dispatch = useDispatch();

  // Initialize authentication state
  useAuthInit();

  useEffect(() => {
    if (loaded) return;
    // dispatch(openModal(EModal.ANNOUNCEMENT));
    loaded = true;
  }, [dispatch]);

  // return (
  //   <>
  //     <Modal />
  //     <iframe
  //       src="https://spinhobby.square.site/"
  //       title="square"
  //       ref={ref}
  //       style={{
  //         width: "100%",
  //         height: "100%",
  //         border: 0,
  //         display: "block",
  //         position: "absolute",
  //       }}
  //     />
  //     {/* <div
  //       style={{
  //         position: "absolute",
  //         backgroundColor: "black",
  //         height: "166px",
  //         width: "100%",
  //         bottom: "0",
  //       }}
  //     /> */}
  //   </>
  // );

  // return (
  //   <Iframe
  //     // title="karano"
  //     url="https://spinhobby.square.site/"
  //     //       style="position:absolute; top:0px; left:0px;
  //     // width:100%; height:100%; border: none; overflow: hidden;"

  //     width="100%"
  //     height="100%"
  //     id=""
  //     className=""
  //     display="block"
  //     position="absolute"
  //     frameBorder={0}
  //   />
  // );

  return (
    <PayPalScriptProvider
      options={{
        clientId:
          "ASauZ1kVM0kTP8lL9O0rnSOtm5reVWEI3rLAik4LM0bWOCkTPd_gXZpEzInq5-he6TKmfFotn9JDgGgr",
        components: "buttons",
        currency: "CAD",
      }}
    >
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="app">
          {beta ? (
            <>
              <NavBarV2 />
              <main className="main">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<CheckOut />} />
                  <Route
                    path="/checkout/success"
                    element={<CheckoutSuccess />}
                  />
                  <Route path="/search" element={<Search />} />
                  <Route path="/product" element={<Product />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route
                    path="/auth/square/callback"
                    element={<SquareCallback />}
                  />
                  <Route path="/events" element={<Events />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/cashier" element={<Cashier />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </>
          ) : (
            <Routes>
              <Route path="/" element={<SquareWeb />} />
              {["login", "cart", "checkout", "search", "product"].map(
                (path, i) => (
                  <Route key={i} path={path} element={<Login />} />
                )
              )}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
          <Modal />
          {/* <div className="main">
          <Home />
        </div> */}
        </div>
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

// function SquareWeb() {
//   return (
//     <>
//       <Modal />
//       <iframe
//         src="https://spinhobby.square.site/"
//         title="square"
//         style={{
//           width: "100%",
//           height: "100%",
//           border: 0,
//           display: "block",
//           position: "absolute",
//         }}
//       />
//     </>
//   );
// }

export default App;
