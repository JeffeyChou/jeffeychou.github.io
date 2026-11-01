// Conference deadlines shown on /conference/. Edit by hand, or run `pnpm deadlines` to sync with ccfddl
// (see README → "Conference deadlines"). The script rewrites this file, so keep notes in `note` fields.
//
// Times are ISO 8601 with the UTC offset the call for papers uses:
//   AoE (Anywhere on Earth) -12:00 · PDT -07:00 · PST -08:00 · EDT -04:00 · EST -05:00 · UTC +00:00 · CET +01:00 · CEST +02:00
// The page shows each deadline as the CFP states it, plus a live countdown and the viewer's local time.
// `estimated: true` = projected from last year's schedule (CFP not out yet).
import type { Cycle, Venue } from '../lib/deadlines';

/** When these dates were last compared with the official pages by hand (shown on the page). */
export const checked = '2026-10-31';
/** When scripts/update-deadlines.ts last synced with ccfddl. */
export const synced: string | undefined = '2026-10-31';

/** csrankings: counted in CSRankings' default ranking · ccf: class on the CCF list (7th edition, 2026) */
export const venues: Record<string, Venue> = {
  SC: { name: 'International Conference for High Performance Computing, Networking, Storage, and Analysis', area: 'hpc', csrankings: true, ccf: 'A' },
  ICS: { name: 'ACM International Conference on Supercomputing', area: 'hpc', csrankings: true, ccf: 'B' },
  HPDC: { name: 'ACM International Symposium on High-Performance Parallel and Distributed Computing', area: 'hpc', csrankings: true, ccf: 'A' },
  PPoPP: { name: 'ACM SIGPLAN Annual Symposium on Principles and Practice of Parallel Programming', area: 'hpc', csrankings: false, ccf: 'A' },
  IPDPS: { name: 'IEEE International Parallel and Distributed Processing Symposium', area: 'hpc', csrankings: false, ccf: 'B' },
  ICPP: { name: 'International Conference on Parallel Processing', area: 'hpc', csrankings: false, ccf: 'B' },
  ASPLOS: { name: 'ACM International Conference on Architectural Support for Programming Languages and Operating Systems', area: 'arch', csrankings: true, ccf: 'A' },
  ISCA: { name: 'ACM/IEEE International Symposium on Computer Architecture', area: 'arch', csrankings: true, ccf: 'A' },
  MICRO: { name: 'IEEE/ACM International Symposium on Microarchitecture', area: 'arch', csrankings: true, ccf: 'A' },
  HPCA: { name: 'IEEE International Symposium on High-Performance Computer Architecture', area: 'arch', csrankings: false, ccf: 'A' },
  SOSP: { name: 'ACM Symposium on Operating Systems Principles', area: 'sys', csrankings: true, ccf: 'A' },
  OSDI: { name: 'USENIX Symposium on Operating Systems Design and Implementation', area: 'sys', csrankings: true, ccf: 'A' },
  EuroSys: { name: 'European Conference on Computer Systems', area: 'sys', csrankings: true, ccf: 'A' },
  FAST: { name: 'USENIX Conference on File and Storage Technologies', area: 'sys', csrankings: true, ccf: 'A' },
  ATC: { name: 'ACM SIGOPS Annual Technical Conference (formerly USENIX ATC)', area: 'sys', csrankings: false, ccf: 'A', ccfddl: 'SIGOPS ATC' },
  SIGCOMM: { name: 'ACM SIGCOMM Conference', area: 'net', csrankings: true, ccf: 'A' },
  NSDI: { name: 'USENIX Symposium on Networked Systems Design and Implementation', area: 'net', csrankings: true, ccf: 'A' },
  SIGMOD: { name: 'ACM SIGMOD International Conference on Management of Data', area: 'db', csrankings: true, ccf: 'A' },
  VLDB: { name: 'International Conference on Very Large Data Bases', area: 'db', csrankings: true, ccf: 'A' },
  ICDE: { name: 'IEEE International Conference on Data Engineering', area: 'db', csrankings: false, ccf: 'A' },
  PLDI: { name: 'ACM SIGPLAN Conference on Programming Language Design and Implementation', area: 'pl', csrankings: true, ccf: 'A' },
  POPL: { name: 'ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages', area: 'pl', csrankings: true, ccf: 'A' },
  CGO: { name: 'IEEE/ACM International Symposium on Code Generation and Optimization', area: 'pl', csrankings: false, ccf: 'B', ccfddl: 'IEEE/ACM CGO' },
};

export const cycles: Cycle[] = [
  // SC
  { conf: 'SC', year: 2026, url: 'https://sc26.supercomputing.org/program/papers/', when: 'Nov 15–20, 2026', where: 'Chicago, IL, USA', abstract: '2026-04-01T23:59:00-12:00', paper: '2026-04-08T23:59:00-12:00',
    milestones: [
      { label: 'Author rebuttal', date: '2026-06-08T00:00:00-12:00', end: '2026-06-11T23:59:00-12:00' },
      { label: 'Notification', date: '2026-07-01T23:59:00-12:00' },
    ] },
  { conf: 'SC', year: 2027, estimated: true, url: 'https://supercomputing.org/', abstract: '2027-03-31T23:59:00-12:00', paper: '2027-04-07T23:59:00-12:00' },
  // ICS
  { conf: 'ICS', year: 2026, cycle: 'Cycle 1', url: 'https://dipsa-qub.github.io/ICS2026-webpage/call-for/call-for-papers.html', when: 'Jul 6–9, 2026', where: 'Belfast, Northern Ireland, UK', abstract: '2025-12-09T23:59:00-12:00', paper: '2025-12-16T23:59:00-12:00',
    milestones: [
      { label: 'Rebuttal', date: '2026-02-10T00:00:00-12:00', end: '2026-02-12T23:59:00-12:00' },
      { label: 'Notification', date: '2026-02-24T23:59:00-12:00' },
    ] },
  { conf: 'ICS', year: 2026, cycle: 'Cycle 2', url: 'https://dipsa-qub.github.io/ICS2026-webpage/call-for/call-for-papers.html', when: 'Jul 6–9, 2026', where: 'Belfast, Northern Ireland, UK', abstract: '2026-02-02T23:59:00-12:00', paper: '2026-02-09T23:59:00-12:00',
    milestones: [
      { label: 'Rebuttal', date: '2026-03-24T00:00:00-12:00', end: '2026-03-26T23:59:00-12:00' },
      { label: 'Notification', date: '2026-04-06T23:59:00-12:00' },
    ] },
  { conf: 'ICS', year: 2027, url: 'https://klab-ai3.github.io/ics2027/calls-cfp.html', when: 'Jun 5–11, 2027', where: 'Atlanta, GA, USA', abstract: '2026-12-01T23:59:00-12:00', paper: '2026-12-07T23:59:00-12:00',
    milestones: [
      { label: 'Early-reject notification', date: '2027-02-11T23:59:00-12:00' },
      { label: 'Author revision window', date: '2027-02-11T00:00:00-12:00', end: '2027-02-23T23:59:00-12:00' },
      { label: 'Final notification', date: '2027-03-12T23:59:00-12:00' },
    ] },
  { conf: 'ICS', year: 2028, estimated: true, url: 'https://www.ics-conference.org/', abstract: '2027-11-30T23:59:00-12:00', paper: '2027-12-06T23:59:00-12:00' },
  // HPDC
  { conf: 'HPDC', year: 2026, url: 'https://hpdc.sci.utah.edu/2026/calls-cfp.html', when: 'Jul 13–16, 2026', where: 'Cleveland, OH, USA', abstract: '2026-01-29T23:59:00-12:00', paper: '2026-02-05T23:59:00-12:00',
    milestones: [
      { label: 'Notification', date: '2026-03-31T23:59:00-12:00' },
    ] },
  { conf: 'HPDC', year: 2027, estimated: true, url: 'https://hpdc.sci.utah.edu/', abstract: '2027-01-28T23:59:00-12:00', paper: '2027-02-04T23:59:00-12:00' },
  // PPoPP
  { conf: 'PPoPP', year: 2027, url: 'https://ppopp27.sigplan.org/track/PPoPP-2027-papers', when: 'Mar 20–24, 2027', where: 'Salt Lake City, UT, USA', paper: '2026-08-03T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-10-13T00:00:00-12:00', end: '2026-10-15T23:59:00-12:00' },
      { label: 'Notification', date: '2026-10-26T23:59:00-12:00' },
    ] },
  { conf: 'PPoPP', year: 2028, estimated: true, url: 'https://www.sigplan.org/Conferences/PPoPP/', paper: '2027-08-02T23:59:00-12:00' },
  // IPDPS
  { conf: 'IPDPS', year: 2027, url: 'https://www.ipdps.org/ipdps2027/2027-call-for-papers.html', when: 'Jun 1–5, 2027', where: 'Seattle, WA, USA', abstract: '2026-10-01T23:59:00-12:00', paper: '2026-10-08T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-11-30T00:00:00-12:00', end: '2026-12-03T23:59:00-12:00' },
      { label: 'First-round decisions', date: '2026-12-18T23:59:00-12:00' },
      { label: 'Revised submissions due', date: '2027-01-18T23:59:00-12:00' },
      { label: 'Final decisions', date: '2027-02-02T23:59:00-12:00' },
    ] },
  { conf: 'IPDPS', year: 2028, estimated: true, url: 'https://www.ipdps.org/', abstract: '2027-09-30T23:59:00-12:00', paper: '2027-10-07T23:59:00-12:00' },
  // ICPP
  { conf: 'ICPP', year: 2026, url: 'https://icpp2026.github.io/call-for-papers/', when: 'Sep 28 – Oct 1, 2026', where: 'Singapore', abstract: '2026-04-24T23:59:00-12:00', paper: '2026-05-01T23:59:00-12:00',
    milestones: [
      { label: 'Notification', date: '2026-06-30T23:59:00-12:00' },
    ] },
  { conf: 'ICPP', year: 2027, estimated: true, url: 'https://icpp2027.github.io/', when: 'Sep 13–17, 2027', where: 'Sapporo, Japan', abstract: '2027-04-23T23:59:00-12:00', paper: '2027-04-30T23:59:00-12:00' },
  // ASPLOS
  { conf: 'ASPLOS', year: 2027, cycle: 'April', url: 'https://www.asplos-conference.org/asplos2027/cfp/', when: 'Apr 11–15, 2027', where: 'Heraklion, Crete, Greece', paper: '2026-04-15T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-07-06T00:00:00-12:00', end: '2026-07-09T23:59:00-12:00' },
      { label: 'Notification', date: '2026-07-27T23:59:00-12:00' },
    ] },
  { conf: 'ASPLOS', year: 2027, cycle: 'September', url: 'https://www.asplos-conference.org/asplos2027/cfp/', when: 'Apr 11–15, 2027', where: 'Heraklion, Crete, Greece', paper: '2026-09-09T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-12-01T00:00:00-12:00', end: '2026-12-04T23:59:00-12:00' },
      { label: 'Notification', date: '2026-12-21T23:59:00-12:00' },
    ] },
  { conf: 'ASPLOS', year: 2028, cycle: 'April', estimated: true, url: 'https://www.asplos-conference.org/', paper: '2027-04-14T23:59:00-12:00' },
  { conf: 'ASPLOS', year: 2028, cycle: 'September', estimated: true, url: 'https://www.asplos-conference.org/', paper: '2027-09-08T23:59:00-12:00' },
  // ISCA
  { conf: 'ISCA', year: 2026, url: 'https://www.iscaconf.org/isca2026/submit/callforpapers.php', when: 'Jun 27 – Jul 1, 2026', where: 'Raleigh, NC, USA', abstract: '2025-11-10T23:59:00-12:00', paper: '2025-11-17T23:59:00-12:00',
    milestones: [
      { label: 'Rebuttal/revision period', date: '2026-02-16T00:00:00-12:00', end: '2026-03-06T23:59:00-12:00' },
      { label: 'Decisions released', date: '2026-03-27T23:59:00-12:00' },
    ] },
  { conf: 'ISCA', year: 2027, url: 'https://www.iscaconf.org/isca2027/submit/callforpapers.php', when: 'Jun 5–9, 2027', where: 'Atlanta, GA, USA', abstract: '2026-11-09T23:59:00-12:00', paper: '2026-11-16T23:59:00-12:00',
    milestones: [
      { label: 'Rebuttal/revision period', date: '2027-02-16T00:00:00-12:00', end: '2027-03-08T23:59:00-12:00' },
      { label: 'Decisions released', date: '2027-03-26T23:59:00-12:00' },
    ] },
  // MICRO
  { conf: 'MICRO', year: 2026, url: 'https://www.microarch.org/micro59/submit/papers.php', when: 'Oct 31 – Nov 4, 2026', where: 'Athens, Greece', abstract: '2026-03-31T23:59:00-04:00', paper: '2026-04-07T23:59:00-04:00',
    milestones: [
      { label: 'Rebuttal/revision', date: '2026-06-03T00:00:00-12:00', end: '2026-06-17T23:59:00-12:00' },
      { label: 'Notification', date: '2026-07-07T23:59:00-12:00' },
    ] },
  { conf: 'MICRO', year: 2027, estimated: true, url: 'https://www.microarch.org/', abstract: '2027-03-30T23:59:00-04:00', paper: '2027-04-06T23:59:00-04:00' },
  // HPCA
  { conf: 'HPCA', year: 2027, url: 'https://conf.researchr.org/track/hpca-2027/hpca-2027-main-conference', when: 'Mar 20–24, 2027', where: 'Salt Lake City, UT, USA', abstract: '2026-07-24T23:59:00-12:00', paper: '2026-07-31T23:59:00-12:00',
    milestones: [
      { label: 'Revision/rebuttal period', date: '2026-09-28T00:00:00-12:00', end: '2026-10-11T23:59:00-12:00' },
      { label: 'Notification', date: '2026-11-06T23:59:00-12:00' },
    ] },
  { conf: 'HPCA', year: 2028, estimated: true, url: 'https://hpca-conf.org/', abstract: '2027-07-23T23:59:00-12:00', paper: '2027-07-30T23:59:00-12:00' },
  // SOSP
  { conf: 'SOSP', year: 2026, url: 'https://sigops.org/s/conferences/sosp/2026/cfp.html', when: 'Sep 29–Oct 2, 2026', where: 'Prague, Czechia', abstract: '2026-03-26T23:59:00-12:00', paper: '2026-04-01T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-06-22T00:00:00-12:00', end: '2026-06-24T23:59:00-12:00' },
      { label: 'Notification', date: '2026-07-03T23:59:00-12:00' },
    ] },
  { conf: 'SOSP', year: 2027, estimated: true, url: 'https://sosp.org/', when: 'Nov 30–Dec 3, 2027', where: 'Vancouver, BC, Canada', abstract: '2027-03-25T23:59:00-12:00', paper: '2027-03-31T23:59:00-12:00' },
  // OSDI
  { conf: 'OSDI', year: 2026, url: 'https://www.usenix.org/conference/osdi26/call-for-papers', when: 'Jul 13–15, 2026', where: 'Seattle, WA, USA', abstract: '2025-12-04T17:59:00-05:00', paper: '2025-12-11T17:59:00-05:00',
    milestones: [
      { label: 'Notification', date: '2026-03-26T23:59:00-12:00' },
    ] },
  { conf: 'OSDI', year: 2027, url: 'https://www.usenix.org/conference/osdi27/call-for-papers', when: 'Jul 7–9, 2027', where: 'Baltimore, MD, USA', abstract: '2026-12-01T17:59:00-05:00', paper: '2026-12-08T17:59:00-05:00',
    milestones: [
      { label: 'Notification', date: '2027-03-16T23:59:00-12:00' },
    ] },
  { conf: 'OSDI', year: 2028, estimated: true, url: 'https://www.usenix.org/conference/osdi28', when: 'Jul 10–12, 2028', where: 'Seattle, WA, USA', abstract: '2027-11-30T17:59:00-05:00', paper: '2027-12-07T17:59:00-05:00' },
  // EuroSys
  { conf: 'EuroSys', year: 2027, cycle: 'Spring', url: 'https://2027.eurosys.org/cfp.html', when: 'Apr 19–23, 2027', where: 'Rabat, Morocco', abstract: '2026-05-07T23:59:00-12:00', paper: '2026-05-14T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-07-29T00:00:00-12:00', end: '2026-07-31T23:59:00-12:00' },
      { label: 'Notification', date: '2026-08-21T23:59:00-12:00' },
    ] },
  { conf: 'EuroSys', year: 2027, cycle: 'Fall', url: 'https://2027.eurosys.org/cfp.html', when: 'Apr 19–23, 2027', where: 'Rabat, Morocco', abstract: '2026-09-17T23:59:00-12:00', paper: '2026-09-24T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2027-01-06T00:00:00-12:00', end: '2027-01-08T23:59:00-12:00' },
      { label: 'Notification', date: '2027-01-29T23:59:00-12:00' },
    ] },
  { conf: 'EuroSys', year: 2028, cycle: 'Spring', estimated: true, url: 'https://www.eurosys.org/', abstract: '2027-05-06T23:59:00-12:00', paper: '2027-05-13T23:59:00-12:00' },
  { conf: 'EuroSys', year: 2028, cycle: 'Fall', estimated: true, url: 'https://www.eurosys.org/', abstract: '2027-09-16T23:59:00-12:00', paper: '2027-09-23T23:59:00-12:00' },
  // FAST
  { conf: 'FAST', year: 2027, cycle: 'Spring', url: 'https://www.usenix.org/conference/fast27/call-for-papers', when: 'Feb 23–25, 2027', where: 'Renton, WA, USA', paper: '2026-03-17T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-05-18T00:00:00-12:00', end: '2026-05-20T23:59:00-12:00' },
      { label: 'Notification', date: '2026-06-04T23:59:00-12:00' },
    ] },
  { conf: 'FAST', year: 2027, cycle: 'Fall', url: 'https://www.usenix.org/conference/fast27/call-for-papers', when: 'Feb 23–25, 2027', where: 'Renton, WA, USA', paper: '2026-09-15T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-11-17T00:00:00-12:00', end: '2026-11-19T23:59:00-12:00' },
      { label: 'Notification', date: '2026-12-08T23:59:00-12:00' },
    ] },
  { conf: 'FAST', year: 2028, cycle: 'Spring', estimated: true, url: 'https://www.usenix.org/conference/fast28', when: 'Feb 28–Mar 1, 2028', where: 'Seattle, WA, USA', paper: '2027-03-16T23:59:00-12:00' },
  { conf: 'FAST', year: 2028, cycle: 'Fall', estimated: true, url: 'https://www.usenix.org/conference/fast28', when: 'Feb 28–Mar 1, 2028', where: 'Seattle, WA, USA', paper: '2027-09-14T23:59:00-12:00' },
  // ATC
  { conf: 'ATC', year: 2026, url: 'https://sigops.org/s/conferences/atc/2026/cfp.html', when: 'Nov 16–18, 2026', where: 'Hong Kong', paper: '2026-06-10T23:59:00-12:00',
    milestones: [
      { label: 'Early rejection', date: '2026-08-01T23:59:00-12:00' },
      { label: 'Author response', date: '2026-08-29T00:00:00-12:00', end: '2026-09-02T23:59:00-12:00' },
      { label: 'Notification', date: '2026-09-18T23:59:00-12:00' },
    ] },
  { conf: 'ATC', year: 2027, estimated: true, url: 'https://sigops.org/s/conferences/atc/', paper: '2027-06-09T23:59:00-12:00' },
  // SIGCOMM
  { conf: 'SIGCOMM', year: 2026, url: 'https://conferences.sigcomm.org/sigcomm/2026/cfp/', when: 'Aug 17–21, 2026', where: 'Denver, CO, USA', abstract: '2026-01-30T23:59:00-12:00', paper: '2026-02-06T23:59:00-12:00',
    milestones: [
      { label: 'Early notification', date: '2026-04-02T23:59:00-12:00' },
      { label: 'Rebuttal', date: '2026-04-27T00:00:00-12:00', end: '2026-04-29T23:59:00-12:00' },
      { label: 'Notification', date: '2026-05-11T23:59:00-12:00' },
      { label: 'One-shot revision due', date: '2026-06-19T23:59:00-12:00' },
      { label: 'Revision notification', date: '2026-06-29T23:59:00-12:00' },
    ] },
  { conf: 'SIGCOMM', year: 2027, url: 'https://conferences.sigcomm.org/sigcomm/2027/cfp/', when: 'Aug 8–12, 2027', where: 'Bangkok, Thailand', paper: '2027-02-02T23:59:00-12:00' },
  // NSDI
  { conf: 'NSDI', year: 2027, cycle: 'Spring', url: 'https://www.usenix.org/conference/nsdi27/call-for-papers', when: 'May 11–13, 2027', where: 'Providence, RI, USA', abstract: '2026-04-16T23:59:00-04:00', paper: '2026-04-23T23:59:00-04:00',
    milestones: [
      { label: 'Notification', date: '2026-07-23T23:59:00-12:00' },
    ] },
  { conf: 'NSDI', year: 2027, cycle: 'Fall', url: 'https://www.usenix.org/conference/nsdi27/call-for-papers', when: 'May 11–13, 2027', where: 'Providence, RI, USA', abstract: '2026-09-10T23:59:00-04:00', paper: '2026-09-17T23:59:00-04:00',
    milestones: [
      { label: 'Notification', date: '2026-12-08T23:59:00-12:00' },
    ] },
  { conf: 'NSDI', year: 2028, cycle: 'Spring', estimated: true, url: 'https://www.usenix.org/conference/nsdi28', when: 'May 9–11, 2028', where: 'Santa Clara, CA, USA', abstract: '2027-04-15T23:59:00-04:00', paper: '2027-04-22T23:59:00-04:00' },
  { conf: 'NSDI', year: 2028, cycle: 'Fall', estimated: true, url: 'https://www.usenix.org/conference/nsdi28', when: 'May 9–11, 2028', where: 'Santa Clara, CA, USA', abstract: '2027-09-09T23:59:00-04:00', paper: '2027-09-16T23:59:00-04:00' },
  // SIGMOD
  { conf: 'SIGMOD', year: 2027, cycle: 'Round 1', url: 'https://2027.sigmodconf.hosting.acm.org/calls_papers_sigmod_research.shtml', when: 'Jun 13–18, 2027', where: 'Huntington Beach, CA, USA', abstract: '2026-01-10T23:59:00-12:00', paper: '2026-01-17T23:59:00-12:00',
    milestones: [
      { label: 'Author feedback', date: '2026-03-10T00:00:00-12:00', end: '2026-03-17T23:59:00-12:00' },
      { label: 'Notification', date: '2026-04-19T23:59:00-12:00' },
      { label: 'Revision due', date: '2026-05-19T23:59:00-12:00' },
      { label: 'Final notification', date: '2026-06-12T23:59:00-12:00' },
    ] },
  { conf: 'SIGMOD', year: 2027, cycle: 'Round 2', url: 'https://2027.sigmodconf.hosting.acm.org/calls_papers_sigmod_research.shtml', when: 'Jun 13–18, 2027', where: 'Huntington Beach, CA, USA', abstract: '2026-04-10T23:59:00-12:00', paper: '2026-04-17T23:59:00-12:00',
    milestones: [
      { label: 'Author feedback', date: '2026-06-10T00:00:00-12:00', end: '2026-06-17T23:59:00-12:00' },
      { label: 'Notification', date: '2026-07-19T23:59:00-12:00' },
      { label: 'Revision due', date: '2026-08-19T23:59:00-12:00' },
      { label: 'Final notification', date: '2026-09-12T23:59:00-12:00' },
    ] },
  { conf: 'SIGMOD', year: 2027, cycle: 'Round 3', url: 'https://2027.sigmodconf.hosting.acm.org/calls_papers_sigmod_research.shtml', when: 'Jun 13–18, 2027', where: 'Huntington Beach, CA, USA', abstract: '2026-07-10T23:59:00-12:00', paper: '2026-07-17T23:59:00-12:00',
    milestones: [
      { label: 'Author feedback', date: '2026-09-10T00:00:00-12:00', end: '2026-09-17T23:59:00-12:00' },
      { label: 'Notification', date: '2026-10-19T23:59:00-12:00' },
      { label: 'Revision due', date: '2026-11-19T23:59:00-12:00' },
      { label: 'Final notification', date: '2026-12-12T23:59:00-12:00' },
    ] },
  { conf: 'SIGMOD', year: 2027, cycle: 'Round 4', url: 'https://2027.sigmodconf.hosting.acm.org/calls_papers_sigmod_research.shtml', when: 'Jun 13–18, 2027', where: 'Huntington Beach, CA, USA', abstract: '2026-10-10T23:59:00-12:00', paper: '2026-10-17T23:59:00-12:00',
    milestones: [
      { label: 'Author feedback', date: '2026-12-10T00:00:00-12:00', end: '2026-12-17T23:59:00-12:00' },
      { label: 'Notification', date: '2027-01-19T23:59:00-12:00' },
      { label: 'Revision due', date: '2027-02-19T23:59:00-12:00' },
      { label: 'Final notification', date: '2027-03-12T23:59:00-12:00' },
    ] },
  { conf: 'SIGMOD', year: 2028, cycle: 'Round 1', estimated: true, url: 'https://2028.sigmod.org/', abstract: '2027-01-10T23:59:00-12:00', paper: '2027-01-17T23:59:00-12:00' },
  { conf: 'SIGMOD', year: 2028, cycle: 'Round 2', estimated: true, url: 'https://2028.sigmod.org/', abstract: '2027-04-10T23:59:00-12:00', paper: '2027-04-17T23:59:00-12:00' },
  { conf: 'SIGMOD', year: 2028, cycle: 'Round 3', estimated: true, url: 'https://2028.sigmod.org/', abstract: '2027-07-10T23:59:00-12:00', paper: '2027-07-17T23:59:00-12:00' },
  { conf: 'SIGMOD', year: 2028, cycle: 'Round 4', estimated: true, url: 'https://2028.sigmod.org/', abstract: '2027-10-10T23:59:00-12:00', paper: '2027-10-17T23:59:00-12:00' },
  // VLDB
  { conf: 'VLDB', year: 2026, cycle: 'Nov 2025', url: 'https://www.vldb.org/pvldb/volumes/19/submission/', when: 'Aug 31–Sep 4, 2026', where: 'Boston, MA, USA', paper: '2025-11-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2026, cycle: 'Dec 2025', url: 'https://www.vldb.org/pvldb/volumes/19/submission/', when: 'Aug 31–Sep 4, 2026', where: 'Boston, MA, USA', paper: '2025-12-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2026, cycle: 'Jan 2026', url: 'https://www.vldb.org/pvldb/volumes/19/submission/', when: 'Aug 31–Sep 4, 2026', where: 'Boston, MA, USA', paper: '2026-01-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2026, cycle: 'Feb 2026', url: 'https://www.vldb.org/pvldb/volumes/19/submission/', when: 'Aug 31–Sep 4, 2026', where: 'Boston, MA, USA', paper: '2026-02-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2026, cycle: 'Mar 2026', url: 'https://www.vldb.org/pvldb/volumes/19/submission/', when: 'Aug 31–Sep 4, 2026', where: 'Boston, MA, USA', paper: '2026-03-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Apr 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-03-25T17:00:00-07:00', paper: '2026-04-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2027, cycle: 'May 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-04-25T17:00:00-07:00', paper: '2026-05-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Jun 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-05-25T17:00:00-07:00', paper: '2026-06-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Jul 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-06-25T17:00:00-07:00', paper: '2026-07-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Aug 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-07-25T17:00:00-07:00', paper: '2026-08-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Sep 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-08-25T17:00:00-07:00', paper: '2026-09-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Oct 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-09-25T17:00:00-07:00', paper: '2026-10-01T17:00:00-07:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Nov 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-10-25T17:00:00-07:00', paper: '2026-11-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Dec 2026', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-11-25T17:00:00-08:00', paper: '2026-12-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Jan 2027', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2026-12-25T17:00:00-08:00', paper: '2027-01-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Feb 2027', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2027-01-25T17:00:00-08:00', paper: '2027-02-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2027, cycle: 'Mar 2027', url: 'https://www.vldb.org/pvldb/volumes/20/submission/', when: 'Aug 23–27, 2027', where: 'Athens, Greece', abstract: '2027-02-25T17:00:00-08:00', paper: '2027-03-01T17:00:00-08:00' },
  { conf: 'VLDB', year: 2028, cycle: 'Apr 2027', estimated: true, url: 'https://www.vldb.org/pvldb/', abstract: '2027-03-25T17:00:00-07:00', paper: '2027-04-01T17:00:00-07:00' },
  // ICDE
  { conf: 'ICDE', year: 2027, cycle: 'Round 1', url: 'https://icde2027.github.io/cf-research-papers.html', when: 'May 17–21, 2027', where: 'Copenhagen, Denmark', paper: '2026-06-11T17:00:00-07:00',
    milestones: [
      { label: 'Author rebuttal', date: '2026-08-08T00:00:00-07:00', end: '2026-08-15T17:00:00-07:00' },
      { label: 'Notification', date: '2026-09-10T17:00:00-07:00' },
    ] },
  { conf: 'ICDE', year: 2027, cycle: 'Round 2', url: 'https://icde2027.github.io/cf-research-papers.html', when: 'May 17–21, 2027', where: 'Copenhagen, Denmark', paper: '2026-11-11T17:00:00-08:00',
    milestones: [
      { label: 'Author rebuttal', date: '2027-01-08T00:00:00-08:00', end: '2027-01-15T17:00:00-08:00' },
      { label: 'Notification', date: '2027-02-10T17:00:00-08:00' },
    ] },
  { conf: 'ICDE', year: 2028, cycle: 'Round 1', estimated: true, url: 'https://ieee-icde.org/', paper: '2027-06-10T17:00:00-07:00' },
  { conf: 'ICDE', year: 2028, cycle: 'Round 2', estimated: true, url: 'https://ieee-icde.org/', paper: '2027-11-10T17:00:00-08:00' },
  // PLDI
  { conf: 'PLDI', year: 2026, url: 'https://pldi26.sigplan.org/track/pldi-2026-papers', when: 'Jun 15–19, 2026', where: 'Boulder, CO, USA', paper: '2025-11-13T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-02-17T00:00:00-12:00', end: '2026-02-22T23:59:00-12:00' },
      { label: 'Notification', date: '2026-03-05T23:59:00-12:00' },
    ] },
  { conf: 'PLDI', year: 2027, url: 'https://pldi27.sigplan.org/track/pldi-2027-papers', when: 'Jun 5–11, 2027', where: 'Atlanta, GA, USA', paper: '2026-11-12T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2027-02-16T00:00:00-12:00', end: '2027-02-18T23:59:00-12:00' },
      { label: 'Notification', date: '2027-03-04T23:59:00-12:00' },
      { label: 'Revision deadline', date: '2027-03-23T23:59:00-12:00' },
      { label: 'Final acceptance notification', date: '2027-04-01T23:59:00-12:00' },
    ] },
  // POPL
  { conf: 'POPL', year: 2027, url: 'https://popl27.sigplan.org/track/POPL-2027-popl-research-papers', when: 'Jan 10–16, 2027', where: 'Mexico City, Mexico', paper: '2026-07-09T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-09-07T00:00:00-12:00', end: '2026-09-10T23:59:00-12:00' },
      { label: 'Notification', date: '2026-10-05T23:59:00-12:00' },
      { label: 'Revision deadline', date: '2026-10-26T23:59:00-12:00' },
      { label: 'Final acceptance notification', date: '2026-11-09T23:59:00-12:00' },
    ] },
  { conf: 'POPL', year: 2028, estimated: true, url: 'https://www.sigplan.org/Conferences/POPL/', paper: '2027-07-08T23:59:00-12:00' },
  // CGO
  { conf: 'CGO', year: 2027, cycle: 'Round 1', url: 'https://2027.cgo.org/track/cgo-2027-papers', when: 'Mar 20–24, 2027', where: 'Salt Lake City, UT, USA', paper: '2026-06-11T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-07-21T00:00:00-12:00', end: '2026-07-23T23:59:00-12:00' },
      { label: 'Notification', date: '2026-08-03T23:59:00-12:00' },
      { label: 'Invited revision submission', date: '2026-09-24T23:59:00-12:00' },
    ] },
  { conf: 'CGO', year: 2027, cycle: 'Round 2', url: 'https://2027.cgo.org/track/cgo-2027-papers', when: 'Mar 20–24, 2027', where: 'Salt Lake City, UT, USA', paper: '2026-09-10T23:59:00-12:00',
    milestones: [
      { label: 'Author response', date: '2026-10-27T00:00:00-12:00', end: '2026-10-29T23:59:00-12:00' },
      { label: 'Notification', date: '2026-11-09T23:59:00-12:00' },
    ] },
  { conf: 'CGO', year: 2028, cycle: 'Round 1', estimated: true, url: 'https://www.cgo.org/', paper: '2027-06-10T23:59:00-12:00' },
  { conf: 'CGO', year: 2028, cycle: 'Round 2', estimated: true, url: 'https://www.cgo.org/', paper: '2027-09-09T23:59:00-12:00' },
];
