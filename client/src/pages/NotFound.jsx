import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Mascot from '../components/Mascot';
import { Blobs } from '../components/ui';

export default function NotFound() {
  return (
    <div className="notfound">
      <Blobs />
      <Mascot size={170} mood="sad" />
      <motion.h1 className="display" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
        4<span className="pop">0</span>4
      </motion.h1>
      <p className="dim" style={{ fontWeight: 700 }}>This page crawled away. Dotty is looking for it.</p>
      <Link to="/" className="btn btn-primary">Take me home</Link>
    </div>
  );
}
