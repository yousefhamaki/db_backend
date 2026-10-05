const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const ctrl = require('../controllers/connections.controller');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/by-site', ctrl.listBySite);
router.get('/by-site/:site', ctrl.getBySite);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
