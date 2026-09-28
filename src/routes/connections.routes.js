const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/connections.controller');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:site', ctrl.get);
router.post('/', ctrl.create);
router.put('/:site', ctrl.update);
router.delete('/:site', ctrl.remove);

module.exports = router;
