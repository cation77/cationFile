import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import About from '../views/About.vue';
import File from '../views/File.vue';
import Db from '../views/Db.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/about',
      name: 'about',
      component: About,
    },
    {
      path: '/file',
      name: 'file',
      component: File,
    },
    {
      path: '/db',
      name: 'db',
      component: Db,
    },
  ],
});

export default router;
