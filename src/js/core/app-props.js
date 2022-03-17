const AppProps = {};

function setAppProps(props) {
  for (const [key, value] of Object.entries(props)) {
    AppProps[key] = value;
  }
}

export { AppProps, setAppProps };
