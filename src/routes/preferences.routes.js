const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/preferences.controller');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.get);
router.put('/', ctrl.update);

module.exports = router;
