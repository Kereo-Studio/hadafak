import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ImportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('recipe_import_jobs')
export class RecipeImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_name' })
  providerName: string;

  @Column({ type: 'varchar', default: ImportJobStatus.PENDING })
  status: ImportJobStatus;

  @Column({ name: 'total_records', type: 'int', default: 0 })
  totalRecords: number;

  @Column({ name: 'imported_records', type: 'int', default: 0 })
  importedRecords: number;

  @Column({ name: 'failed_records', type: 'int', default: 0 })
  failedRecords: number;

  @Column({ name: 'duplicate_records', type: 'int', default: 0 })
  duplicateRecords: number;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @Column({ type: 'jsonb', default: [] })
  logs: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
