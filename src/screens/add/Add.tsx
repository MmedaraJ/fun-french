import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Loader } from '../../components/Loader';
import AddHub from './AddHub';
import './Add.css';

const AddWord = lazy(() => import('./AddWord'));
const AddText = lazy(() => import('./AddText'));
const AddPhoto = lazy(() => import('./AddPhoto'));

/** /add and its sub-flows: /add/word, /add/text, /add/photo. */
export default function Add() {
  const location = useLocation();
  return (
    <Suspense fallback={<Loader />}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route index element={<AddHub />} />
          <Route path="word" element={<AddWord />} />
          <Route path="text" element={<AddText />} />
          <Route path="photo" element={<AddPhoto />} />
          <Route path="*" element={<AddHub />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
