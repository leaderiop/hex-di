import React from 'react';
import Layout from '@theme/Layout';
import Translate from '@docusaurus/Translate';

export default function SearchPage(): JSX.Element {
  return (
    <Layout
      title="Search"
      description="Search the HexDI documentation"
    >
      <main className="container margin-vert--lg">
        <h1>
          <Translate id="theme.SearchPage.title">Search</Translate>
        </h1>
        <p>
          <Translate id="theme.SearchPage.inputPlaceholder">
            Use the search bar in the navigation to search the documentation.
          </Translate>
        </p>
      </main>
    </Layout>
  );
}
