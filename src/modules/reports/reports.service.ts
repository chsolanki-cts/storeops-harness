import { ReportsRepository } from './reports.repository';
import { Report, GetReportQuery } from './reports.types';
import { NotFoundError } from '../../common/errors';

export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  getReports(query: GetReportQuery): Report[] {
    return this.repo.findAll(query);
  }

  getReport(id: string): Report {
    const report = this.repo.findById(id);
    if (!report) throw new NotFoundError('Report', id);
    return report;
  }
}
