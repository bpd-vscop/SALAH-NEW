export const Footer: React.FC = () => (
  <footer className="site-footer">
    <div className="footer-columns">
      <div>
        <h4>About</h4>
        <p>
          A single-stop marketplace for locksmiths, fleet operators, and local businesses.
          Trusted since 2010.
        </p>
      </div>
      <div>
        <h4>Visit Us</h4>
        <p>123 Industrial Ave, Springfield, USA</p>
        <p>Mon - Fri, 9am - 6pm</p>
      </div>
      <div>
        <h4>Support</h4>
        <p>support@salahstore.test</p>
        <p>(555) 123-4567</p>
      </div>
    </div>
    <div className="footer-bottom">No returns. All sales are final. © {new Date().getFullYear()} SALAH Store</div>
  </footer>
);
