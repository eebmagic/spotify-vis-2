{ pkgs ? import <nixpkgs> {}, isDev ? false }:

let
  pythonPackages = ps: with ps; [
    pip  # Add pip explicitly
    requests
    beautifulsoup4
    flask
    flask-cors
  ];

  python = pkgs.python3.withPackages pythonPackages;

  lib = pkgs.lib;
  envVars = if isDev then {
    # REACT_APP_API_URL = "http://127.0.0.1:3000/api";
  } else {
    # REACT_APP_API_URL = "https://fol.ebolton.site/api";
  };

in pkgs.mkShell {
  buildInputs = with pkgs; [
    # Python environment
    python
    
    # Node.js environment
    nodejs_20
    nodePackages.npm
    
    # Development tools
    watchman
  ];

  shellHook = ''
    # Create virtual environment if it doesn't exist
    if [ ! -d .venv ]; then
      python -m venv .venv
      source .venv/bin/activate
      pip install requests flask flask-cors beautifulsoup4
    else
      source .venv/bin/activate
      pip install requests flask flask-cors beautifulsoup4
    fi

    # Set up Node.js environment variables
    export NODE_OPTIONS=--openssl-legacy-provider
    
    # Set React API URL based on environment
    ${lib.concatMapStringsSep "\n" (name: "export ${name}=${envVars.${name}}") (lib.attrNames envVars)}
    # echo "Using REACT_APP_API_URL: $REACT_APP_API_URL"

    # Install frontend dependencies if node_modules doesn't exist
    if [ ! -d frontend/node_modules ]; then
      echo "Installing frontend dependencies..."
      cd frontend && npm install && cd ..
    fi

    # Build the frontend directly
    echo "Building frontend..."
    (cd frontend && npm run build && cd ..)

    # Start the Python server
    echo "Starting Python server..."
    cd server && python server.py
  '';

  # Environment variables
  PYTHONPATH = "./server";
  NODE_ENV = "development";
}

