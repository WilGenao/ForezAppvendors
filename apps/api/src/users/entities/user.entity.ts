import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true, length: 255 }) email: string;
  @Column({ name: 'email_verified_at', nullable: true }) emailVerifiedAt: Date;
  @Column({ name: 'password_hash' }) passwordHash: string;
  @Column({ name: 'totp_secret', nullable: true, select: false }) totpSecret: string;
  @Column({ name: 'totp_enabled', default: false }) totpEnabled: boolean;
  @Column({ default: 'pending_verification' }) status: string;
  @Column({ name: 'last_login_at', nullable: true }) lastLoginAt: Date;
  @Column({ name: 'last_login_ip', nullable: true, type: 'inet' }) lastLoginIp: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date;
  @Column({ name: 'created_by', nullable: true }) createdBy: string;
}
