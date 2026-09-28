const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');

const router = Router();

router.post('/signup', ctrl.signup);
router.post('/verify-email', ctrl.verifyEmail);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

module.exports = router;
