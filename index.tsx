import * as React from 'react';

import * as ReactDOM from 'react-dom/client';

import {
  createBrowserRouter,
  RouterProvider,
  useNavigate,
} from 'react-router-dom';

import './index.css';

const useNavigateEnhance = () => {
  const navigate = useNavigate();

  return (r: string, callback?: Function | Promise<any>) => {
    if (typeof callback === 'function') {
      if(callback(r)) {
        navigate(r);
      }
    } else if (callback instanceof Promise) {
      callback.then(() => navigate(r));
    } else {
      navigate(r);
    }
  };
};

const Home = () => {
  const navigate = useNavigateEnhance();
  const onClick = () => {
    navigate('/about', () => true);
  };
  return (
    <>
      <h2>Hello world!</h2>
      <p onClick={onClick}>About</p>
    </>
  );
};

const About = () => {
  const navigate = useNavigate();
  const onClick = () => {
    navigate('/');
  };
  return (
    <>
      <h2>about page!</h2>
      <p onClick={onClick}>Home</p>
    </>
  );
};

const router = createBrowserRouter([
  {
    path: '/',

    element: <Home />,
  },
  {
    path: '/about',
    element: <About />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
