
import { UserAccount } from '../types';
import { db } from './db';

export const getUsers = async (): Promise<UserAccount[]> => {
  return await db.users.getAll();
};

export const saveUser = async (user: UserAccount & { uid: string }): Promise<void> => {
  await db.users.add(user);
};

export const deleteUser = async (uid: string): Promise<void> => {
  if (uid === 'admin') { // You might want a more robust way to protect the admin account
    console.warn('Attempted to delete the admin account.');
    return;
  }
  await db.users.delete(uid);
};
