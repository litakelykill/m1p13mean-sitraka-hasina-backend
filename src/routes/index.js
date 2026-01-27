const router = express.Router();

// Import
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
// ...

// Montage
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/boutique', boutiqueRoutes);
router.use('/client', clientRoutes);

module.exports = router;