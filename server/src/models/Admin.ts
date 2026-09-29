import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

export interface IAdmin extends Document {
  username: string;
  passwordHash: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const adminSchema = new Schema<IAdmin>(
  {
    username: {
      type: String,
      required: [true, '사용자 이름은 필수입니다'],
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: [true, '비밀번호는 필수입니다']
    }
  },
  {
    timestamps: true
  }
);

// 비밀번호 비교 메서드
adminSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// 비밀번호 해싱 유틸리티 (정적 메서드)
adminSchema.statics.hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
};

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);

